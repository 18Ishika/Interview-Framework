from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.authentication import ClerkAuthentication
from interview_sessions.models import Session, CodingRound
from .models import (
    Question,
    CodeTemplate,
    TestCase,
    CodingRoundQuestion,
    Submission,
    TestCaseResult,
    DifficultyChoices,
    LanguageChoices,
)
from .services.judge0_service import Judge0Service

ROUND_DURATION_MINUTES = 45  # Standard 45-minute coding round


def prepare_full_source_code(submitted_code: str, language: str, template: CodeTemplate = None) -> str:
    """
    Combines user's solution code with driver code if needed.
    """
    if not template or not template.driver_code or not template.driver_code.strip():
        return submitted_code

    driver = template.driver_code.strip()
    if driver.startswith("//") and len(driver.splitlines()) == 1:
        # Placeholder comment only
        return submitted_code

    if language == "python":
        if "if __name__" in submitted_code:
            return submitted_code
        return f"{submitted_code}\n\n{driver}"
    elif language == "cpp":
        if "int main(" in submitted_code:
            return submitted_code
        return f"{submitted_code}\n\n{driver}"
    elif language == "java":
        if "public static void main" in submitted_code:
            return submitted_code
        return f"{submitted_code}\n\n{driver}"

    return submitted_code


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def start_coding_round_view(request):
    """
    POST /api/coding-round/start/

    Round Flexibility Logic:
    1. Gets user's most recent interview session from DB.
    2. If all round statuses in recent session are 'completed', starts a new session.
    3. If any round status is 'pending'/'in_progress':
       - If coding_round was already 'completed' in this session, returns already_completed=True
         so frontend can show an informative popup.
       - If coding_round is 'pending'/'in_progress', reuses that session ID to create/resume coding round.
    4. Supports force_new=True to explicitly create a fresh session if requested.
    """
    user = request.user
    force_new = request.data.get("force_new", False)

    recent_session = Session.objects.filter(user=user).order_by("-created_at").first()

    session = None
    if not recent_session or force_new:
        session = Session.objects.create(
            user=user,
            target_role=recent_session.target_role if recent_session else "Software Engineer",
            coding_status="in_progress",
            overall_status="in_progress",
        )
    else:
        if recent_session.is_all_completed():
            # All rounds of the last session are finished -> Start fresh session
            session = Session.objects.create(
                user=user,
                target_role=recent_session.target_role or "Software Engineer",
                coding_status="in_progress",
                overall_status="in_progress",
            )
        else:
            # Candidate attempted a round that is already completed in active session
            if recent_session.coding_status == "completed":
                return Response({
                    "success": False,
                    "already_completed": True,
                    "message": "You have already completed the Coding Round for this interview session. Please proceed to the remaining rounds (Technical or HR) to complete your interview.",
                    "session_id": str(recent_session.id),
                    "coding_status": recent_session.coding_status,
                    "tech_status": recent_session.tech_status,
                    "hr_status": recent_session.hr_status,
                }, status=status.HTTP_200_OK)


            # coding_status is 'pending' or 'in_progress' -> Use recent_session
            session = recent_session
            session.coding_status = "in_progress"
            session.save(update_fields=["coding_status", "updated_at"])



    # 2. Get or create CodingRound
    coding_round, created = CodingRound.objects.get_or_create(session=session)
    if created or not coding_round.started_at:
        coding_round.started_at = timezone.now()
        coding_round.save(update_fields=["started_at"])

    # 3. Assign 1 Easy, 1 Medium, 1 Hard question if not already assigned
    existing_round_questions = CodingRoundQuestion.objects.filter(coding_round=coding_round).select_related("question")
    
    if not existing_round_questions.exists():
        selected_questions = []
        for diff in [DifficultyChoices.EASY, DifficultyChoices.MEDIUM, DifficultyChoices.HARD]:
            q = Question.objects.filter(difficulty=diff, is_active=True).order_by("created_at").first()
            if q:
                selected_questions.append(q)

        # Fallback if specific difficulties missing: get any active questions up to 3
        if not selected_questions:
            selected_questions = list(Question.objects.filter(is_active=True)[:3])

        for q in selected_questions:
            CodingRoundQuestion.objects.create(
                coding_round=coding_round,
                question=q,
                question_version=q.version,
                scoring_strategy="partial",
            )
        existing_round_questions = CodingRoundQuestion.objects.filter(coding_round=coding_round).select_related("question")

    # 4. Calculate timer
    elapsed_seconds = int((timezone.now() - coding_round.started_at).total_seconds())
    total_seconds = ROUND_DURATION_MINUTES * 60
    remaining_seconds = max(0, total_seconds - elapsed_seconds)

    # 5. Format questions data (ONLY Python, Java, C++)
    allowed_langs = [LanguageChoices.PYTHON, LanguageChoices.JAVA, LanguageChoices.CPP]
    questions_data = []

    for rq in existing_round_questions:
        q = rq.question
        templates_qs = CodeTemplate.objects.filter(question=q, language__in=allowed_langs)
        templates_map = {
            t.language: {
                "boilerplate_code": t.boilerplate_code,
                "driver_code": t.driver_code,
            }
            for t in templates_qs
        }

        # Visible test cases only
        sample_cases = TestCase.objects.filter(question=q, is_hidden=False).values(
            "id", "input_data", "expected_output", "score_weight"
        )

        # Fetch latest submission if exists
        latest_sub = Submission.objects.filter(coding_round_question=rq).order_by("-created_at").first()
        latest_sub_data = None
        if latest_sub:
            latest_sub_data = {
                "language": latest_sub.language,
                "submitted_code": latest_sub.submitted_code,
                "status": latest_sub.status,
                "score": latest_sub.score,
            }

        questions_data.append({
            "round_question_id": str(rq.id),
            "question_id": str(q.id),
            "title": q.title,
            "description": q.description,
            "difficulty": q.difficulty,
            "time_limit_ms": q.time_limit_ms,
            "memory_limit_kb": q.memory_limit_kb,
            "score_achieved": rq.score_achieved,
            "templates": templates_map,
            "sample_test_cases": list(sample_cases),
            "latest_submission": latest_sub_data,
        })

    return Response({
        "success": True,
        "session_id": str(session.id),
        "coding_round_id": str(coding_round.id),
        "started_at": coding_round.started_at,
        "duration_minutes": ROUND_DURATION_MINUTES,
        "remaining_seconds": remaining_seconds,
        "total_score": coding_round.total_score,
        "questions": questions_data,
    })


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def run_code_view(request):
    """
    POST /api/coding-round/run/

    Runs user code against sample/visible test cases via Judge0.
    Does not record a final submission.
    """
    round_question_id = request.data.get("round_question_id")
    language = (request.data.get("language") or "").lower()
    code = request.data.get("code", "")
    custom_input = request.data.get("custom_input")

    if not round_question_id or not language or not code:
        return Response({"error": "Missing round_question_id, language, or code"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        round_question = CodingRoundQuestion.objects.select_related("question", "coding_round__session").get(
            id=round_question_id,
            coding_round__session__user=request.user,
        )
    except CodingRoundQuestion.DoesNotExist:
        return Response({"error": "Question round not found"}, status=status.HTTP_404_NOT_FOUND)

    template = CodeTemplate.objects.filter(question=round_question.question, language=language).first()
    full_source = prepare_full_source_code(code, language, template)

    results = []
    all_passed = True

    if custom_input is not None:
        exec_res = Judge0Service.execute_code(
            source_code=full_source,
            language=language,
            stdin=custom_input,
            cpu_time_limit=round_question.question.time_limit_ms / 1000.0,
            memory_limit=round_question.question.memory_limit_kb,
        )
        results.append({
            "test_case_id": "custom",
            "is_custom": True,
            "input_data": custom_input,
            "expected_output": "",
            "actual_output": exec_res.get("stdout", ""),
            "stderr": exec_res.get("stderr", "") or exec_res.get("compile_output", ""),
            "status": exec_res.get("status", "runtime_error"),
            "passed": exec_res.get("success", False),
            "execution_time_ms": exec_res.get("execution_time_ms", 0),
            "memory_used_kb": exec_res.get("memory_used_kb", 0),
        })
    else:
        sample_cases = TestCase.objects.filter(question=round_question.question, is_hidden=False)
        for tc in sample_cases:
            exec_res = Judge0Service.execute_code(
                source_code=full_source,
                language=language,
                stdin=tc.input_data,
                expected_output=tc.expected_output,
                cpu_time_limit=round_question.question.time_limit_ms / 1000.0,
                memory_limit=round_question.question.memory_limit_kb,
            )

            passed = exec_res.get("passed", False)
            if not passed:
                all_passed = False

            results.append({
                "test_case_id": str(tc.id),
                "is_custom": False,
                "input_data": tc.input_data,
                "expected_output": tc.expected_output,
                "actual_output": exec_res.get("stdout", ""),
                "stderr": exec_res.get("stderr", "") or exec_res.get("compile_output", ""),
                "status": exec_res.get("status", "runtime_error"),
                "passed": passed,
                "execution_time_ms": exec_res.get("execution_time_ms", 0),
                "memory_used_kb": exec_res.get("memory_used_kb", 0),
            })

    return Response({
        "success": True,
        "all_passed": all_passed,
        "results": results,
    })


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def submit_question_view(request):
    """
    POST /api/coding-round/submit-question/

    Evaluates user code against ALL test cases (both visible and hidden).
    Calculates score, creates Submission & TestCaseResult records.
    """
    round_question_id = request.data.get("round_question_id")
    language = (request.data.get("language") or "").lower()
    code = request.data.get("code", "")

    if not round_question_id or not language or not code:
        return Response({"error": "Missing round_question_id, language, or code"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        round_question = CodingRoundQuestion.objects.select_related("question", "coding_round__session").get(
            id=round_question_id,
            coding_round__session__user=request.user,
        )
    except CodingRoundQuestion.DoesNotExist:
        return Response({"error": "Question round not found"}, status=status.HTTP_404_NOT_FOUND)

    template = CodeTemplate.objects.filter(question=round_question.question, language=language).first()
    full_source = prepare_full_source_code(code, language, template)

    all_test_cases = TestCase.objects.filter(question=round_question.question)
    total_weight = sum(tc.score_weight for tc in all_test_cases) or 100.0
    passed_weight = 0.0

    attempt_number = Submission.objects.filter(coding_round_question=round_question).count() + 1

    submission = Submission.objects.create(
        coding_round_question=round_question,
        attempt_number=attempt_number,
        language=language,
        submitted_code=code,
        status="running",
        submitted_at=timezone.now(),
    )

    test_case_results = []
    overall_status = "accepted"
    max_time_ms = 0
    max_memory_kb = 0
    total_passed_count = 0
    first_error_msg = ""

    for tc in all_test_cases:
        exec_res = Judge0Service.execute_code(
            source_code=full_source,
            language=language,
            stdin=tc.input_data,
            expected_output=tc.expected_output,
            cpu_time_limit=round_question.question.time_limit_ms / 1000.0,
            memory_limit=round_question.question.memory_limit_kb,
        )

        passed = exec_res.get("passed", False)
        t_ms = exec_res.get("execution_time_ms", 0)
        m_kb = exec_res.get("memory_used_kb", 0)
        max_time_ms = max(max_time_ms, t_ms)
        max_memory_kb = max(max_memory_kb, m_kb)

        if passed:
            passed_weight += tc.score_weight
            total_passed_count += 1
        else:
            if overall_status == "accepted":
                overall_status = exec_res.get("status", "wrong_answer")
                first_error_msg = exec_res.get("stderr") or exec_res.get("compile_output") or "Output did not match expected output"

        # Record test case result
        TestCaseResult.objects.create(
            submission=submission,
            test_case=tc,
            actual_output=exec_res.get("stdout", ""),
            passed=passed,
            execution_time_ms=t_ms,
            memory_used_kb=m_kb,
        )

        test_case_results.append({
            "test_case_id": str(tc.id),
            "is_hidden": tc.is_hidden,
            "passed": passed,
            "score_weight": tc.score_weight,
            "execution_time_ms": t_ms,
            "input_data": tc.input_data if not tc.is_hidden else "[Hidden]",
            "expected_output": tc.expected_output if not tc.is_hidden else "[Hidden]",
            "actual_output": exec_res.get("stdout", "") if not tc.is_hidden else ("[Hidden]" if not passed else "[Passed]"),
            "status": exec_res.get("status", "wrong_answer"),
        })

    # Normalized score out of 100
    score = round((passed_weight / total_weight) * 100.0, 1)

    submission.status = overall_status if total_passed_count < len(all_test_cases) else "accepted"
    submission.score = score
    submission.execution_time_ms = max_time_ms
    submission.memory_used_kb = max_memory_kb
    submission.error_message = first_error_msg
    submission.is_final = True
    submission.save()

    # Update question score
    round_question.score_achieved = score
    round_question.final_submission = submission
    round_question.save(update_fields=["score_achieved", "final_submission", "updated_at"])

    # Update round total score
    all_rqs = CodingRoundQuestion.objects.filter(coding_round=round_question.coding_round)
    avg_round_score = round(sum(rq.score_achieved for rq in all_rqs) / max(1, all_rqs.count()), 1)
    round_question.coding_round.total_score = avg_round_score
    round_question.coding_round.save(update_fields=["total_score", "updated_at"])

    return Response({
        "success": True,
        "submission_id": str(submission.id),
        "status": submission.status,
        "score": score,
        "passed_count": total_passed_count,
        "total_test_cases": len(all_test_cases),
        "execution_time_ms": max_time_ms,
        "memory_used_kb": max_memory_kb,
        "test_cases": test_case_results,
    })


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def finish_coding_round_view(request):
    """
    POST /api/coding-round/finish/

    Submits and completes the coding round, computes final scores.
    """
    coding_round_id = request.data.get("coding_round_id")
    if not coding_round_id:
        return Response({"error": "Missing coding_round_id"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        coding_round = CodingRound.objects.select_related("session").get(
            id=coding_round_id,
            session__user=request.user,
        )
    except CodingRound.DoesNotExist:
        return Response({"error": "Coding round not found"}, status=status.HTTP_404_NOT_FOUND)

    coding_round.submitted_at = timezone.now()

    # Re-calculate total score
    round_questions = CodingRoundQuestion.objects.filter(coding_round=coding_round).select_related("question")
    if round_questions.exists():
        avg_score = round(sum(rq.score_achieved for rq in round_questions) / round_questions.count(), 1)
        coding_round.total_score = avg_score

    coding_round.save(update_fields=["submitted_at", "total_score", "updated_at"])

    # Update session status
    session = coding_round.session
    session.coding_status = "completed"
    session.save(update_fields=["coding_status", "updated_at"])

    breakdown = []
    for rq in round_questions:
        breakdown.append({
            "title": rq.question.title,
            "difficulty": rq.question.difficulty,
            "score": rq.score_achieved,
        })

    return Response({
        "success": True,
        "message": "Coding round completed successfully",
        "total_score": coding_round.total_score,
        "session_id": str(session.id),
        "questions_summary": breakdown,
    })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from users.authentication import ClerkAuthentication
from django.utils import timezone
from .models import Session, TechnicalRound, HrRound
from .serializers import MediaUploadSerializer
from .services.cloudinary_service import CloudinaryService


class TechnicalRoundUploadView(APIView):
    """
    POST /api/interview/technical/upload/

    Upload video and/or audio recordings for a Technical Round.

    Request body (multipart/form-data):
        - session_id (UUID): The interview session ID.
        - video (File, optional): Video recording file.
        - audio (File, optional): Audio recording file.

    At least one of video or audio must be provided.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = MediaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data.get("session_id")
        video_file = serializer.validated_data.get("video")
        audio_file = serializer.validated_data.get("audio")

        # For testing: generate session_id if not provided
        if not session_id:
            import uuid
            session_id = uuid.uuid4()

        # For testing: get the session, or create/use a default one if not found
        user = request.user if (request.user and request.user.is_authenticated) else None
        if not user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.first()

        session, _ = Session.objects.get_or_create(id=session_id, defaults={"user": user})

        # Get or create the TechnicalRound record
        tech_round, _ = TechnicalRound.objects.get_or_create(session=session)

        uploaded = {}

        try:
            if video_file:
                video_url = CloudinaryService.upload_video(video_file, session.user.id, session_id, "technical")
                tech_round.video_recording = video_url
                uploaded["video_url"] = video_url

            if audio_file:
                audio_url = CloudinaryService.upload_audio(audio_file, session.user.id, session_id, "technical")
                if not isinstance(tech_round.audio_recording, list):
                    tech_round.audio_recording = []
                tech_round.audio_recording.append(audio_url)
                uploaded["audio_url"] = audio_url
                print("="*10,"\n",uploaded["audio_url"])

            tech_round.save()

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Technical round recording(s) uploaded successfully.",
                "session_id": str(session_id),
                "technical_round_id": str(tech_round.id),
                **uploaded,
            },
            status=status.HTTP_200_OK,
        )


class HrRoundUploadView(APIView):
    """
    POST /api/interview/hr/upload/

    Upload video and/or audio recordings for an HR Round.

    Request body (multipart/form-data):
        - session_id (UUID): The interview session ID.
        - video (File, optional): Video recording file.
        - audio (File, optional): Audio recording file.

    At least one of video or audio must be provided.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = MediaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data.get("session_id")
        video_file = serializer.validated_data.get("video")
        audio_file = serializer.validated_data.get("audio")

        # For testing: generate session_id if not provided
        if not session_id:
            import uuid
            session_id = uuid.uuid4()

        # For testing: get the session, or create/use a default one if not found
        user = request.user if (request.user and request.user.is_authenticated) else None
        if not user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.first()

        session, _ = Session.objects.get_or_create(id=session_id, defaults={"user": user})

        # Get or create the HrRound record
        hr_round, created = HrRound.objects.get_or_create(session=session)
        if created or not hr_round.started_at:
            hr_round.started_at = timezone.now()

        uploaded = {}

        try:
            if video_file:
                video_url = CloudinaryService.upload_video(video_file, session.user.id, session_id, "hr")
                hr_round.video_recording = video_url
                uploaded["video_url"] = video_url

            if audio_file:
                audio_url = CloudinaryService.upload_audio(audio_file, session.user.id, session_id, "hr")
                if not isinstance(hr_round.audio_recording, list):
                    hr_round.audio_recording = []
                hr_round.audio_recording.append(audio_url)
                uploaded["audio_url"] = audio_url

            hr_round.submitted_at = timezone.now()
            hr_round.save()

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "HR round recording(s) uploaded successfully.",
                "session_id": str(session_id),
                "hr_round_id": str(hr_round.id),
                **uploaded,
            },
            status=status.HTTP_200_OK,
        )


from django.core.cache import cache
from users.utils.cache_utils import get_history_cache_key, CACHE_TTL_HISTORY

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_interview_history_view(request):
    """
    GET /api/interview/history/

    Returns a summary list of past interview sessions for the logged-in user.
    Shows completed sessions only when BOTH QnA and video analysis are completed.
    Shows 'evaluating' status for sessions where evaluation is currently pending.
    """
    try:
        sessions = Session.objects.filter(user=request.user).order_by("-created_at")

        history = []
        for session in sessions:
            tech_state = "pending"
            hr_state = "pending"

            # 1. Technical Round Evaluation Status Check
            if hasattr(session, "technical_round"):
                tech_round = session.technical_round
                qna_done = bool(tech_round.ai_evaluation and isinstance(tech_round.ai_evaluation, dict) and tech_round.ai_evaluation.get("overall_rating"))
                has_video = bool(tech_round.video_recording)
                video_done = bool(tech_round.posture_metric or tech_round.eye_contact_metrics or tech_round.voice_metrics) if has_video else True

                if qna_done and video_done:
                    tech_state = "completed"
                elif tech_round.submitted_at or session.tech_status in ["in_progress", "completed"] or tech_round.questions_asked or tech_round.audio_recording or tech_round.video_recording:
                    tech_state = "evaluating"

            # 2. HR Round Evaluation Status Check
            if hasattr(session, "hr_round"):
                hr_round = session.hr_round
                qna_done = bool(hr_round.qna_metrics and isinstance(hr_round.qna_metrics, dict) and hr_round.qna_metrics.get("overall_rating"))
                has_video = bool(hr_round.video_recording)
                video_done = bool(hr_round.posture_metric or hr_round.eye_contact_metrics or hr_round.voice_metrics) if has_video else True

                if qna_done and video_done:
                    hr_state = "completed"
                elif hr_round.submitted_at or session.hr_status in ["in_progress", "completed"] or hr_round.questions_asked or hr_round.audio_recording or hr_round.video_recording:
                    hr_state = "evaluating"

            is_coding_completed = (session.coding_status == "completed")

            # Filter out sessions that are completely unstarted / pending without any evaluation activity
            if tech_state == "pending" and hr_state == "pending" and not is_coding_completed and session.overall_status != "completed":
                continue

            entry = {
                "session_id": str(session.id),
                "target_role": session.target_role,
                "tech_status": tech_state,
                "hr_status": hr_state,
            }

            if tech_state == "completed" and hasattr(session, "technical_round"):
                tech_round = session.technical_round
                entry["technical_rating"] = tech_round.ai_evaluation.get("overall_rating")
                entry["technical_summary"] = tech_round.ai_evaluation.get("overall_summary")
                entry["technical_submitted_at"] = tech_round.submitted_at or tech_round.created_at
            elif tech_state == "evaluating" and hasattr(session, "technical_round"):
                tech_round = session.technical_round
                entry["technical_submitted_at"] = tech_round.submitted_at or tech_round.created_at

            if hr_state == "completed" and hasattr(session, "hr_round"):
                hr_round = session.hr_round
                entry["hr_rating"] = hr_round.qna_metrics.get("overall_rating")
                entry["hr_summary"] = hr_round.qna_metrics.get("overall_summary")
                entry["hr_submitted_at"] = hr_round.submitted_at or hr_round.created_at
            elif hr_state == "evaluating" and hasattr(session, "hr_round"):
                hr_round = session.hr_round
                entry["hr_submitted_at"] = hr_round.submitted_at or hr_round.created_at

            history.append(entry)

        return Response({"history": history})

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_technical_results_by_session_view(request, session_id):
    """
    GET /api/interview/technical/results/<session_id>/

    Same shape as get_results_view's completed response, but looked up
    by an explicit session_id instead of the Django session — needed so
    past (non-current) technical reports can be reopened from history.
    """
    try:
        tech_round = TechnicalRound.objects.get(
            session_id=session_id, session__user=request.user
        )
    except TechnicalRound.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    qna_done = bool(tech_round.ai_evaluation and isinstance(tech_round.ai_evaluation, dict) and tech_round.ai_evaluation.get("overall_rating"))
    has_video = bool(tech_round.video_recording)
    video_done = bool(tech_round.posture_metric or tech_round.eye_contact_metrics or tech_round.voice_metrics) if has_video else True

    if not (qna_done and video_done):
        return Response({"status": "evaluating", "message": "Evaluation in progress"})

    return Response({
        "message": "Evaluation completed",
        "status": "completed",
        "report": tech_round.ai_evaluation,
        "raw_results": tech_round.questions_asked,
    })
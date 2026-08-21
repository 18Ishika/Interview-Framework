from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .serializers import UserSerializer
from .serializers import UserSerializer
from .utils.api_response import (
    success_response,
    error_response
)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_user(request):
    user = request.user 
    serializer = UserSerializer(user)
    return Response({
        "message": "User synced successfully",
        "user": serializer.data
    }, status=status.HTTP_200_OK)


# Get current logged in user profile
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):

    serializer = UserSerializer(
        request.user
    )

    return success_response(
        data=serializer.data,
        message="Profile fetched successfully",
        code="PROFILE_FETCHED"
    )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user

    if request.method == "GET":
        serializer = UserSerializer(user)
        return Response(serializer.data)

    if request.method == "PATCH":
            serializer = UserSerializer(
                request.user,
                data=request.data,
                partial=True
            )

            if serializer.is_valid():

                serializer.save()

                return success_response(
                    data=serializer.data,
                    message="Profile updated successfully",
                    code="PROFILE_UPDATED"
                )

            return error_response(
                errors=serializer.errors,
                message="Validation failed",
                code="VALIDATION_ERROR",
                status_code=400
            )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile_details(request):
    user = request.user

    user_data = {
        "id": user.id,
        "clerk_user_id": user.clerk_user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role,
        "profile_img_url": user.profile_img_url,
        "resume_url": user.resume_url,
        "platform_id": user.platform_id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }

    # Fetch education as list of strings
    education_data = [
        edu.instituion_name for edu in user.educations.all()
    ]

    # Fetch experience
    experience_data = [
        {
            "id": exp.id,
            "company_name": exp.company_name,
            "title": exp.title,
            "employment_type": exp.employment_type,
            "start_date": exp.start_date,
            "end_date": exp.end_date,
            "desc": exp.desc,
        }
        for exp in user.experiences.all()
    ]

    # Fetch projects: description should be a list of strings
    project_data = [
        {
            "title": proj.title,
            "description": [line.strip() for line in proj.desc.split("\n") if line.strip()]
        }
        for proj in user.projects.all()
    ]

    # Fetch skills as a simple list of strings
    skills_data = [
        cs.skill.name for cs in user.candidate_skills.all().select_related("skill")
    ]

    # Fetch latest session scores
    latest_session = user.sessions.order_by("-created_at").first()
    scores = {
        "overall": 0,
        "coding": 0,
        "tech": 0,
        "hr": 0
    }

    if latest_session:
        try:
            if hasattr(latest_session, "coding_round") and latest_session.coding_round:
                scores["coding"] = latest_session.coding_round.total_score
        except Exception:
            pass
            
        try:
            if hasattr(latest_session, "technical_round") and latest_session.technical_round:
                ai_eval = latest_session.technical_round.ai_evaluation
                if isinstance(ai_eval, dict):
                    scores["tech"] = ai_eval.get("overall_score", 0)
        except Exception:
            pass
            
        try:
            if hasattr(latest_session, "hr_round") and latest_session.hr_round:
                # We can try to extract a score, or just set it based on some metrics.
                # For now, we will mock the HR score if it's missing a direct overall score.
                hr_eval = latest_session.hr_round.qna_metrics
                if isinstance(hr_eval, dict):
                    scores["hr"] = hr_eval.get("overall_score", 85) # fallback to 85 if exists but no score
                else:
                    scores["hr"] = 80 # default fallback
        except Exception:
            pass
            
        # simple average for overall
        total = (scores["coding"] + scores["tech"] + scores["hr"]) / 3
        scores["overall"] = round(total, 2)

    return Response({
        "user": user_data,
        "education": education_data,
        "experience": experience_data,
        "projects": project_data,
        "skills": skills_data,
        "scores": scores,
        "job_recommendations": [{"job":job} for job in user.recommended_jobs] or []
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
def get_public_profile_details_by_platform_id(request, platform_id):
    from .models import User
    try:
        user = User.objects.get(platform_id=platform_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user_data = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "profile_img_url": user.profile_img_url,
        "resume_url": user.resume_url,
        "platform_id": user.platform_id,
        "created_at": user.created_at,
    }

    education_data = [edu.instituion_name for edu in user.educations.all()]

    experience_data = [
        {
            "id": exp.id,
            "company_name": exp.company_name,
            "title": exp.title,
            "employment_type": exp.employment_type,
            "start_date": exp.start_date,
            "end_date": exp.end_date,
            "desc": exp.desc,
        }
        for exp in user.experiences.all()
    ]

    project_data = [
        {
            "title": proj.title,
            "description": [line.strip() for line in proj.desc.split("\n") if line.strip()]
        }
        for proj in user.projects.all()
    ]

    skills_data = [cs.skill.name for cs in user.candidate_skills.all().select_related("skill")]

    latest_session = user.sessions.order_by("-created_at").first()
    scores = {"overall": 0, "coding": 0, "tech": 0, "hr": 0}

    if latest_session:
        try:
            if hasattr(latest_session, "coding_round") and latest_session.coding_round:
                scores["coding"] = latest_session.coding_round.total_score
        except Exception:
            pass
            
        try:
            if hasattr(latest_session, "technical_round") and latest_session.technical_round:
                ai_eval = latest_session.technical_round.ai_evaluation
                if isinstance(ai_eval, dict):
                    scores["tech"] = ai_eval.get("overall_score", 0)
        except Exception:
            pass
            
        try:
            if hasattr(latest_session, "hr_round") and latest_session.hr_round:
                hr_eval = latest_session.hr_round.qna_metrics
                if isinstance(hr_eval, dict):
                    scores["hr"] = hr_eval.get("overall_score", 85)
                else:
                    scores["hr"] = 80
        except Exception:
            pass
            
        total = (scores["coding"] + scores["tech"] + scores["hr"]) / 3
        scores["overall"] = round(total, 2)

    return Response({
        "user": user_data,
        "education": education_data,
        "experience": experience_data,
        "projects": project_data,
        "skills": skills_data,
        "scores": scores,
        "job_recommendations": []
    }, status=status.HTTP_200_OK)
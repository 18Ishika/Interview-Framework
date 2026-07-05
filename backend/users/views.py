from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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

    return Response({
        "user": user_data,
        "education": education_data,
        "experience": experience_data,
        "projects": project_data,
        "skills": skills_data,
        "job_recommendations": [{"job":job} for job in user.recommended_jobs] or []
    }, status=status.HTTP_200_OK)
from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.parser import extract_text_from_file
from .services.extractor import extract_skills, extract_projects, extract_education
from .services.recommender import recommend_jobs
from users.models import User

class ResumeParseView(APIView):


    def post(self, request):
        file = request.FILES.get("resume")
        if not file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            text = extract_text_from_file(file)
            skills = extract_skills(text)
            projects = extract_projects(text)
            education = extract_education(text)
            recommendations = recommend_jobs(skills)

            # save skills to user
            user = request.user
            user.skills = ", ".join(skills)
            user.save()

            return Response({
                "skills": skills,
                "projects": projects,
                "education": education,
                "job_recommendations": recommendations
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to parse resume.", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
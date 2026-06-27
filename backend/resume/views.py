import re
from django.db import transaction
from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.parser import extract_text_from_file
from .services.extractor import extract_skills, extract_projects, extract_education
from .services.recommender import recommend_jobs
from users.models import User, Skill, CandidateSkill, Education, Project

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

            user = request.user

            with transaction.atomic():
                # 1. Clear existing parsed records for this user to avoid duplicates/stale data
                CandidateSkill.objects.filter(user=user).delete()
                Project.objects.filter(user=user).delete()
                Education.objects.filter(user=user).delete()

                # 2. Save skills and associate them with the candidate (handling deduplication)
                for skill_name in skills:
                    cleaned_name = skill_name.strip()
                    if not cleaned_name:
                        continue

                    # Canonicalize casing: uppercase acronyms (AWS, HTML, etc.), otherwise Titlecase
                    if cleaned_name.isupper():
                        canonical_name = cleaned_name
                    else:
                        canonical_name = cleaned_name.title()

                    # Query case-insensitively to prevent duplicates in Skill table
                    skill_obj = Skill.objects.filter(name__iexact=canonical_name).first()
                    if not skill_obj:
                        try:
                            skill_obj = Skill.objects.create(name=canonical_name, category="technical")
                        except Exception:
                            # Fallback if created concurrently or otherwise exists
                            skill_obj = Skill.objects.filter(name__iexact=canonical_name).first()

                    if skill_obj:
                        CandidateSkill.objects.get_or_create(
                            user=user,
                            skill=skill_obj,
                            defaults={"proficiency": "beginner"}
                        )

                # 3. Save projects
                for proj in projects:
                    title = proj.get("title", "").strip()
                    if not title:
                        continue
                    desc_list = proj.get("description", [])
                    desc = "\n".join(desc_list) if isinstance(desc_list, list) else str(desc_list)

                    Project.objects.create(
                        user=user,
                        title=title[:255],
                        desc=desc
                    )

                # 4. Save education
                for edu_str in education:
                    edu_str = edu_str.strip()
                    if not edu_str:
                        continue

                    edu_lower = edu_str.lower()
                    degree = "bachelors"  # Default fallback

                    if any(kw in edu_lower for kw in ["phd", "p.h.d", "doctor"]):
                         degree = "phd"
                    elif any(kw in edu_lower for kw in ["master", "m.tech", "m.e", "msc", "m.a", "mba"]):
                         degree = "masters"
                    elif any(kw in edu_lower for kw in ["bachelor", "b.tech", "b.e", "bsc", "b.a", "b.com", "bba"]):
                         degree = "bachelors"
                    elif "diploma" in edu_lower:
                         degree = "diploma"
                    elif any(kw in edu_lower for kw in ["12th", "intermediate", "higher secondary"]):
                         degree = "intermediate"
                    elif any(kw in edu_lower for kw in ["10th", "high school", "secondary"]):
                         degree = "high_school"

                    # Parse field of study
                    field_match = re.search(r"\bin\s+([^,.\d]+)", edu_str, re.IGNORECASE)
                    field_of_study = field_match.group(1).strip() if field_match else ""

                    # Parse institution name
                    inst_match = re.search(r"(?:from|at)\s+([^,.\d]+)", edu_str, re.IGNORECASE)
                    instituion_name = inst_match.group(1).strip() if inst_match else ""

                    if not instituion_name or len(instituion_name) < 3:
                        instituion_name = edu_str

                    Education.objects.create(
                        user=user,
                        instituion_name=instituion_name[:255],
                        degree=degree,
                        field_of_study=field_of_study[:255]
                    )

                # 5. Save recommended jobs to user
                user.recommended_jobs = [role.get("job") for role in recommendations if role["match_percent"]>=33]
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

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import json

from users.authentication import ClerkAuthentication
from .services.pick import (
    start_interview,
    get_current_question,
    get_current_answer_data,
    save_result,
    advance_question,
    get_all_results
)
from .services.transcription import transcribe
from .services.scoring import score_answer


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def start_interview_view(request):
    try:
        role_name = request.data.get("role")

        if not role_name:
            return Response({"error": "Role is required"}, status=400)

        question = start_interview(request, role_name)
        return Response(question)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_question_view(request):
    try:
        question = get_current_question(request)
        return Response(question)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def evaluate_answer_view(request):
    try:
        audio_file = request.FILES.get("audio")

        if not audio_file:
            return Response({"error": "Audio file is required"}, status=400)

        answer_data = get_current_answer_data(request)
        if not answer_data:
            return Response({"error": "No active question found"}, status=400)

        transcript = transcribe(audio_file)

        result = score_answer(
            candidate=transcript,
            reference=answer_data["answer"],
            forced_keywords=answer_data["keywords"]
        )
        result["transcript"] = transcript

        save_result(request, result)
        advance_question(request)
        next_question = get_current_question(request)

        return Response({
            "result": result,
            "next_question": next_question
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_results_view(request):
    try:
        results = get_all_results(request)

        if not results:
            return Response({"error": "No results found"}, status=400)

        return Response({"results": results})

    except Exception as e:
        return Response({"error": str(e)}, status=500)
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


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_interview_history_view(request):
    """
    GET /api/interview/history/

    Returns a summary list of every past interview session for the
    logged-in user, so the frontend can render a history/dashboard list.
    """
    try:
        # NOTE: swap "-created_at" for whatever timestamp field your
        # Session model actually has (or "-id" if there isn't one).
        sessions = Session.objects.filter(user=request.user).order_by("-created_at")

        history = []
        for session in sessions:
            entry = {
                "session_id": str(session.id),
                "target_role": session.target_role,
                "tech_status": session.tech_status,
                "hr_status": session.hr_status,
            }

            if hasattr(session, "technical_round"):
                tech_round = session.technical_round
                if tech_round.ai_evaluation:
                    entry["technical_rating"] = tech_round.ai_evaluation.get("overall_rating")
                    entry["technical_summary"] = tech_round.ai_evaluation.get("overall_summary")
                entry["technical_submitted_at"] = tech_round.submitted_at

            if hasattr(session, "hr_round"):
                hr_round = session.hr_round
                entry["hr_submitted_at"] = hr_round.submitted_at

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

    if tech_round.session.tech_status != "completed":
        return Response({"status": tech_round.session.tech_status})

    return Response({
        "message": "Evaluation completed",
        "status": "completed",
        "report": tech_round.ai_evaluation,
        "raw_results": tech_round.questions_asked,
    })
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

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

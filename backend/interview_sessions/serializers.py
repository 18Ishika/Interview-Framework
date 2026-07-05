from rest_framework import serializers


ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",  # .mov
    "video/x-msvideo",  # .avi
]

ALLOWED_AUDIO_TYPES = [
    "audio/mpeg",       # .mp3
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",        # .m4a
]

MAX_VIDEO_SIZE = 200 * 1024 * 1024  # 200 MB
MAX_AUDIO_SIZE = 50 * 1024 * 1024   # 50 MB


class MediaUploadSerializer(serializers.Serializer):
    """Validates video and audio file uploads for interview rounds."""

    session_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="UUID of the interview session."
    )
    video = serializers.FileField(
        required=False,
        allow_null=True,
        help_text="Video recording of the interview round."
    )
    audio = serializers.FileField(
        required=False,
        allow_null=True,
        help_text="Audio recording of the interview round."
    )

    def validate(self, attrs):
        video = attrs.get("video")
        audio = attrs.get("audio")

        if not video and not audio:
            raise serializers.ValidationError(
                "At least one file (video or audio) must be provided."
            )
        return attrs

    def validate_video(self, value):
        if value is None:
            return value

        if value.content_type not in ALLOWED_VIDEO_TYPES:
            raise serializers.ValidationError(
                f"Unsupported video format '{value.content_type}'. "
                f"Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}"
            )

        if value.size > MAX_VIDEO_SIZE:
            raise serializers.ValidationError(
                f"Video file too large ({value.size // (1024*1024)} MB). "
                f"Maximum allowed: {MAX_VIDEO_SIZE // (1024*1024)} MB."
            )
        return value

    def validate_audio(self, value):
        if value is None:
            return value

        if value.content_type not in ALLOWED_AUDIO_TYPES:
            raise serializers.ValidationError(
                f"Unsupported audio format '{value.content_type}'. "
                f"Allowed: {', '.join(ALLOWED_AUDIO_TYPES)}"
            )

        if value.size > MAX_AUDIO_SIZE:
            raise serializers.ValidationError(
                f"Audio file too large ({value.size // (1024*1024)} MB). "
                f"Maximum allowed: {MAX_AUDIO_SIZE // (1024*1024)} MB."
            )
        return value

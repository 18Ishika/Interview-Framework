from rest_framework import serializers


MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_RESUME_SIZE = 10 * 1024 * 1024

ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
]

ALLOWED_RESUME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]


def validate_profile_image(file):

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise serializers.ValidationError(
            "Only JPG, JPEG, PNG and WEBP images are allowed."
        )

    if file.size > MAX_IMAGE_SIZE:
        raise serializers.ValidationError(
            "Profile image size cannot exceed 5 MB."
        )


def validate_resume(file):

    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise serializers.ValidationError(
            "Only PDF, DOC and DOCX resumes are allowed."
        )

    if file.size > MAX_RESUME_SIZE:
        raise serializers.ValidationError(
            "Resume size cannot exceed 10 MB."
        )
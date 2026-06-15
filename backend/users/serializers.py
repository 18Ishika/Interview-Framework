from rest_framework import serializers
from .models import User
from .services.cloudinary_service import CloudinaryService
from .validators import validate_profile_image, validate_resume


class UserSerializer(serializers.ModelSerializer):

    profile_img = serializers.FileField(
        write_only=True,
        required=False,
        validators=[validate_profile_image]
    )

    resume = serializers.FileField(
        write_only=True,
        required=False,
        validators=[validate_resume],
    )

    class Meta:
        model = User

        fields = [
            "id",
            "clerk_user_id",
            "role",
            "profile_img",
            "resume",
            "profile_img_url",
            "resume_url",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "profile_img_url",
            "resume_url",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):

        profile_img = validated_data.pop(
            "profile_img",
            None
        )

        resume = validated_data.pop(
            "resume",
            None
        )

        profile_img_url = None
        resume_url = None

        if profile_img:
            profile_img_url = (
                CloudinaryService
                .upload_profile_image(profile_img)
            )

        if resume:
            resume_url = (
                CloudinaryService
                .upload_resume(resume)
            )

        return User.objects.create(
            profile_img_url=profile_img_url,
            resume_url=resume_url,
            **validated_data
        )

    def update(self, instance, validated_data):

        profile_img = validated_data.pop(
            "profile_img",
            None
        )

        resume = validated_data.pop(
            "resume",
            None
        )

        if profile_img:
            instance.profile_img_url = (
                CloudinaryService
                .upload_profile_image(profile_img)
            )

        if resume:
            instance.resume_url = (
                CloudinaryService
                .upload_resume(resume)
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        return instance
    

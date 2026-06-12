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


# Called after signup/login from frontend
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_user(request):
    user = request.user  # already get_or_created in ClerkAuthentication
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
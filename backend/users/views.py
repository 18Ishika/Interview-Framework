from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .serializers import UserSerializer
from .utils.api_response import (
    success_response,
    error_response
)


class UserViewSet(viewsets.GenericViewSet):

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request):

        serializer = self.get_serializer(
            self.get_object()
        )

        return success_response(
            data=serializer.data,
            message="Profile fetched successfully",
            code="PROFILE_FETCHED"
        )

    def partial_update(self, request):

        serializer = self.get_serializer(
            self.get_object(),
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

    def destroy(self, request):

        user = self.get_object()

        user.delete()

        return success_response(
            data=None,
            message="Account deleted successfully",
            code="ACCOUNT_DELETED"
        )
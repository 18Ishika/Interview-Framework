from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .serializers import UserSerializer
from .models import User


# Keep your existing ViewSet (for admin/other use)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


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
    user = request.user
    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user

    if request.method == "GET":
        serializer = UserSerializer(user)
        return Response(serializer.data)

    if request.method == "PATCH":
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
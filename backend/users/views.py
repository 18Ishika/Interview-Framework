from django.shortcuts import render
from rest_framework import viewsets
from .serializers import UserSerializer
from .models import User

# User View Set
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
from django.urls import path, include
from .views import sync_user, me , profile


urlpatterns = [
    path("sync/", sync_user, name="sync-user"),
    path("me/", me, name="me"),
    path("profile/", profile, name="profile"),
]
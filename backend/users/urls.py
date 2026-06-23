from django.urls import path, include
from .views import sync_user, me, profile, get_profile_details


urlpatterns = [
    path("sync/", sync_user, name="sync-user"),
    path("me/", me, name="me"),
    path("profile/", profile, name="profile"),
    path("details/", get_profile_details, name="profile-details"),
]
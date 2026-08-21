from django.urls import path, include
from .views import sync_user, me, profile, get_profile_details, get_public_profile_details_by_platform_id


urlpatterns = [
    path("sync/", sync_user, name="sync-user"),
    path("me/", me, name="me"),
    path("profile/", profile, name="profile"),
    path("profile-details/", get_profile_details, name="profile-details"),
    path("public/profile/<str:platform_id>/", get_public_profile_details_by_platform_id, name="public-profile-details"),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, sync_user, me , profile

router = DefaultRouter()
router.register(r"users", UserViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("sync/", sync_user, name="sync-user"),
    path("me/", me, name="me"),
    path("profile/", profile, name="profile"),
]
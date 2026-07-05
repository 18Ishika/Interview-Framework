from django.urls import path
from .views import TechnicalRoundUploadView, HrRoundUploadView

urlpatterns = [
    path("technical/upload/", TechnicalRoundUploadView.as_view(), name="technical-round-upload"),
    path("hr/upload/", HrRoundUploadView.as_view(), name="hr-round-upload"),
]

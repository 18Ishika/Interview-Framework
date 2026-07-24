from django.urls import path
from .views import TechnicalRoundUploadView, HrRoundUploadView , get_interview_history_view , get_technical_results_by_session_view

urlpatterns = [
    path("technical/upload/", TechnicalRoundUploadView.as_view(), name="technical-round-upload"),
    path("hr/upload/", HrRoundUploadView.as_view(), name="hr-round-upload"),
    path("history/", get_interview_history_view, name="interview-history"),
    path( "technical/results/<uuid:session_id>/",get_technical_results_by_session_view, name="technical-results-by-session"),
]

from django.urls import path
from . import views

urlpatterns = [
    path('start/', views.start_hr_interview, name='start_hr_interview'),
    path('upload-chunk/', views.upload_chunk, name='upload_chunk'),
    path('finish-upload/', views.finish_upload, name='finish_upload'),
    path('metrics/<uuid:session_id>/', views.get_hr_behavior_metrics, name='get_hr_behavior_metrics'),
]

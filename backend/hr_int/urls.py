from django.urls import path
from . import views

urlpatterns = [
    path('start/', views.start_hr_interview, name='start_hr_interview'),
    path('upload-chunk/', views.upload_chunk, name='upload_chunk'),
    path('finish-upload/', views.finish_upload, name='finish_upload'),
    path('metrics/<uuid:session_id>/', views.get_hr_behavior_metrics, name='get_hr_behavior_metrics'),
    path('question/', views.get_question_view, name='get_question'),
    path('question-audio/', views.question_audio, name='question_audio'),
    path('evaluate/', views.evaluate_answer_view, name='evaluate_answer'),
    path('results/', views.get_results_view, name='get_results'),
]

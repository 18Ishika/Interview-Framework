from django.urls import path
from . import views

urlpatterns = [
    path('start/', views.start_interview_view, name='start_interview'),
    path('question/', views.get_question_view, name='get_question'),
    path('evaluate/', views.evaluate_answer_view, name='evaluate_answer'),
    path('results/', views.get_results_view, name='get_results'),
    path('status/', views.get_interview_status, name='get_interview_status'),
    path('question-audio/', views.question_audio, name='question_audio'),
    path('acknowledge/', views.acknowledge_result_view, name='acknowledge_result'),
    path('notifications/pending/', views.get_pending_notifications_view, name='pending_notifications'),
]
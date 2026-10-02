from django.urls import path
from .views import (
    start_coding_round_view,
    run_code_view,
    submit_question_view,
    finish_coding_round_view,
)

urlpatterns = [
    path("start/", start_coding_round_view, name="coding_round_start"),
    path("run/", run_code_view, name="coding_round_run"),
    path("submit-question/", submit_question_view, name="coding_round_submit_question"),
    path("finish/", finish_coding_round_view, name="coding_round_finish"),
]

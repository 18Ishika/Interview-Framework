from django.contrib import admin
from .models import (
    Question,
    CodeTemplate,
    TestCase,
    CodingRoundQuestion,
    Submission,
    TestCaseResult,
)


class CodeTemplateInline(admin.TabularInline):
    model = CodeTemplate
    extra = 1


class TestCaseInline(admin.TabularInline):
    model = TestCase
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("title", "difficulty", "version", "is_active", "time_limit_ms", "memory_limit_kb", "created_at")
    list_filter = ("difficulty", "is_active")
    search_fields = ("title", "description")
    inlines = [CodeTemplateInline, TestCaseInline]


@admin.register(CodeTemplate)
class CodeTemplateAdmin(admin.ModelAdmin):
    list_display = ("question", "language", "created_at")
    list_filter = ("language",)
    search_fields = ("question__title",)


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ("question", "is_hidden", "score_weight", "created_at")
    list_filter = ("is_hidden",)
    search_fields = ("question__title",)


@admin.register(CodingRoundQuestion)
class CodingRoundQuestionAdmin(admin.ModelAdmin):
    list_display = ("coding_round", "question", "scoring_strategy", "score_achieved", "created_at")
    list_filter = ("scoring_strategy",)
    search_fields = ("question__title",)


class TestCaseResultInline(admin.TabularInline):
    model = TestCaseResult
    extra = 0
    readonly_fields = ("test_case", "actual_output", "passed", "execution_time_ms", "memory_used_kb")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("coding_round_question", "attempt_number", "language", "status", "score", "is_final", "created_at")
    list_filter = ("status", "language", "is_final")
    search_fields = ("coding_round_question__question__title",)
    inlines = [TestCaseResultInline]


@admin.register(TestCaseResult)
class TestCaseResultAdmin(admin.ModelAdmin):
    list_display = ("submission", "test_case", "passed", "execution_time_ms", "memory_used_kb")
    list_filter = ("passed",)

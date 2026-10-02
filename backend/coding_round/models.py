import uuid
from django.db import models


class DifficultyChoices(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class LanguageChoices(models.TextChoices):
    PYTHON = "python", "Python"
    JAVASCRIPT = "javascript", "JavaScript"
    CPP = "cpp", "C++"
    JAVA = "java", "Java"


class ScoringStrategyChoices(models.TextChoices):
    ALL_OR_NOTHING = "all_or_nothing", "All or Nothing"
    PARTIAL = "partial", "Partial"


class SubmissionStatusChoices(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    ACCEPTED = "accepted", "Accepted"
    WRONG_ANSWER = "wrong_answer", "Wrong Answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded", "Time Limit Exceeded"
    MEMORY_LIMIT_EXCEEDED = "memory_limit_exceeded", "Memory Limit Exceeded"
    RUNTIME_ERROR = "runtime_error", "Runtime Error"
    COMPILATION_ERROR = "compilation_error", "Compilation Error"


class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    difficulty = models.CharField(
        max_length=20,
        choices=DifficultyChoices.choices,
        default=DifficultyChoices.EASY,
    )
    time_limit_ms = models.IntegerField(default=2000)
    memory_limit_kb = models.IntegerField(default=262144)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.get_difficulty_display()})"


class CodeTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="code_templates",
    )
    language = models.CharField(
        max_length=30,
        choices=LanguageChoices.choices,
    )
    boilerplate_code = models.TextField(blank=True, default="")
    driver_code = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("question", "language")

    def __str__(self):
        return f"{self.question.title} - {self.get_language_display()}"


class TestCase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="test_cases",
    )
    input_data = models.TextField()
    expected_output = models.TextField()
    is_hidden = models.BooleanField(default=False)
    score_weight = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        type_str = "Hidden" if self.is_hidden else "Sample"
        return f"{type_str} TestCase for {self.question.title} (weight: {self.score_weight})"


class CodingRoundQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coding_round = models.ForeignKey(
        "interview_sessions.CodingRound",
        on_delete=models.CASCADE,
        related_name="coding_round_questions",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="assigned_rounds",
    )
    question_version = models.IntegerField(default=1)
    scoring_strategy = models.CharField(
        max_length=50,
        choices=ScoringStrategyChoices.choices,
        default=ScoringStrategyChoices.PARTIAL,
    )
    final_submission = models.ForeignKey(
        "Submission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    score_achieved = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Question {self.question.title} in Round {self.coding_round_id}"


class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coding_round_question = models.ForeignKey(
        CodingRoundQuestion,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    attempt_number = models.IntegerField(default=1)
    language = models.CharField(
        max_length=30,
        choices=LanguageChoices.choices,
    )
    submitted_code = models.TextField()
    status = models.CharField(
        max_length=50,
        choices=SubmissionStatusChoices.choices,
        default=SubmissionStatusChoices.PENDING,
    )
    execution_time_ms = models.IntegerField(null=True, blank=True)
    memory_used_kb = models.IntegerField(null=True, blank=True)
    score = models.FloatField(default=0.0)
    error_message = models.TextField(null=True, blank=True)
    is_final = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Submission #{self.attempt_number} ({self.status}) for {self.coding_round_question_id}"


class TestCaseResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name="test_case_results",
    )
    test_case = models.ForeignKey(
        TestCase,
        on_delete=models.CASCADE,
        related_name="results",
    )
    actual_output = models.TextField(null=True, blank=True)
    passed = models.BooleanField(default=False)
    execution_time_ms = models.IntegerField(null=True, blank=True)
    memory_used_kb = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        status = "Passed" if self.passed else "Failed"
        return f"TestCaseResult ({status}) for Submission {self.submission_id}"

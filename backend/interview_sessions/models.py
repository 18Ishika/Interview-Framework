import uuid
from django.db import models
from users.models import User

class Session(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    target_role = models.CharField(max_length=255, null=True, blank=True)
    jd = models.TextField(null=True, blank=True)
    resume_text = models.TextField(null=True, blank=True)
    coding_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")
    tech_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")
    hr_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")
    overall_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")
    report_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.id} - {self.user.first_name}"

class CodingRound(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name="coding_round")
    questions_assigned = models.JSONField(default=list, blank=True)
    submissions = models.JSONField(default=list, blank=True)
    total_score = models.FloatField(default=0.0)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"CodingRound {self.id} for Session {self.session.id}"

class TechnicalRound(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name="technical_round")
    video_recording = models.URLField(null=True, blank=True)
    audio_recording = models.URLField(null=True, blank=True)
    generated_prompt = models.TextField(null=True, blank=True)
    questions_asked = models.JSONField(default=list, blank=True)
    ai_evaluation = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"TechnicalRound {self.id} for Session {self.session.id}"

class HrRound(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name="hr_round")
    video_recording = models.URLField(null=True, blank=True)
    audio_recording = models.URLField(null=True, blank=True)
    transcripts = models.TextField(null=True, blank=True)
    posture_metric = models.JSONField(default=dict, blank=True)
    eye_contact_metrics = models.JSONField(default=dict, blank=True)
    voice_metrics = models.JSONField(default=dict, blank=True)
    qna_metrics = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"HrRound {self.id} for Session {self.session.id}"

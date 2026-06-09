from django.db import models

# User Model
class User(models.Model):
    ROLE_CHOICES = [
        ("candidate", "Candidate"),
    ]

    clerk_user_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="candidate"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.clerk_user_id} ({self.role})"
from django.db import models

def resume_upload_path(instance, filename):
    return f"resumes/{instance.clerk_user_id}/{filename}"

def photo_upload_path(instance, filename):
    return f"photos/{instance.clerk_user_id}/{filename}"

class User(models.Model):
    ROLE_CHOICES = [
        ("candidate", "Candidate"),
    ]

    clerk_user_id = models.CharField(max_length=255, unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="candidate")

    # New fields
    resume = models.FileField(upload_to=resume_upload_path, null=True, blank=True)
    photo = models.ImageField(upload_to=photo_upload_path, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.clerk_user_id} ({self.role})"
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.clerk_user_id} ({self.role})"
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

    profile_img_url = models.URLField(blank=True, null=True)

    resume_url = models.URLField(blank=True, null=True)

    skills = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(
        auto_now_add=True
    )
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
    

# Education Model
class Education(models.Model):
    EDUCATION_LEVELS = [
         ("high_school", "High School"),
        ("intermediate", "Intermediate"),
        ("diploma", "Diploma"),
        ("bachelors", "Bachelors"),
        ("masters", "Masters"),
        ("phd", "PhD"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="educations"
    )

    education_level = models.CharField(max_length=20, choices=EDUCATION_LEVELS)

    instituion_name = models.CharField(max_length=255)

    degree = models.CharField(max_length=255, blank=True)

    field_of_study = models.CharField(
        max_length=255,
        blank=True
    )

    grade = models.CharField(
        max_length=20,
        blank=True
    )

    start_date = models.DateField(
        null=True,
        blank=True
    )

    end_date = models.DateField(
        null=True,
        blank=True
    )

    is_current = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-end_date"]

    def __str__(self):
        return (
            f"{self.institution_name}"
            f" - {self.degree}"
        )

class Experience(models.Model):

    EMPLOYMENT_TYPES = [
        ("internship", "Internship"),
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("freelance", "Freelance"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="experiences"
    )

    company_name = models.CharField(
        max_length=255
    )

    job_title = models.CharField(
        max_length=255
    )

    employment_type = models.CharField(
        max_length=20,
        choices=EMPLOYMENT_TYPES
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True
    )

    is_current = models.BooleanField(
        default=False
    )

    location = models.CharField(
        max_length=255,
        blank=True
    )

    description = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return (
            f"{self.job_title}"
            f" at {self.company_name}"
        )
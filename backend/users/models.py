import uuid
from django.db import models

class User(models.Model):
    ROLE_CHOICES = [
        ("candidate", "Candidate"),
        ("admin", "Admin"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clerk_user_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    profile_img_url = models.URLField(blank=True, null=True)
    resume_url = models.URLField(blank=True, null=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="candidate")
    recommended_jobs = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

class Skill(models.Model):
    CATEGORY_CHOICES = [
        ("technical", "Technical"),
        ("soft", "Soft"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="technical")

    def __str__(self):
        return self.name

class CandidateSkill(models.Model):
    PROFICIENCY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
        ("expert", "Expert"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="candidate_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="candidates")
    proficiency = models.CharField(max_length=50, choices=PROFICIENCY_CHOICES, default="beginner")

    def __str__(self):
        return f"{self.user} - {self.skill.name} ({self.proficiency})"

class Education(models.Model):
    DEGREE_CHOICES = [
        ("high_school", "High School"),
        ("intermediate", "Intermediate"),
        ("diploma", "Diploma"),
        ("bachelors", "Bachelors"),
        ("masters", "Masters"),
        ("phd", "PhD"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="educations")
    instituion_name = models.CharField(max_length=255)
    degree = models.CharField(max_length=50, choices=DEGREE_CHOICES)
    field_of_study = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.instituion_name} - {self.degree}"

class Experience(models.Model):
    EMPLOYMENT_TYPES = [
        ("internship", "Internship"),
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("freelance", "Freelance"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="experiences")
    company_name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    employment_type = models.CharField(max_length=50, choices=EMPLOYMENT_TYPES)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    desc = models.TextField(blank=True)

    def __str__(self):
        return f"{self.title} at {self.company_name}"

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects")
    title = models.CharField(max_length=255)
    desc = models.TextField(blank=True)

    def __str__(self):
        return self.title
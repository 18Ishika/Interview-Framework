import uuid
from django.db import models
from django.utils import timezone
from users.models import User


class PlanType(models.TextChoices):
    USAGE_BASED = "usage_based", "Usage Based"
    CALENDAR_BASED = "calendar_based", "Calendar Based"


class SubscriptionPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    plan_type = models.CharField(
        max_length=20,
        choices=PlanType.choices,
        default=PlanType.USAGE_BASED,
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)  # In INR
    included_usage_days = models.PositiveIntegerField(null=True, blank=True)
    duration_months = models.PositiveIntegerField(null=True, blank=True)
    duration_years = models.PositiveIntegerField(null=True, blank=True)
    daily_session_limit = models.PositiveIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscription_plans"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_plan_type_display()}) - ₹{self.price}"


class Subscription(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")

    # Snapshot of plan terms at purchase time
    plan_type = models.CharField(
        max_length=20,
        choices=PlanType.choices,
        default=PlanType.USAGE_BASED,
    )
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)  # In INR
    allowed_usage_days = models.PositiveIntegerField(null=True, blank=True)
    duration_months = models.PositiveIntegerField(null=True, blank=True)
    duration_years = models.PositiveIntegerField(null=True, blank=True)
    daily_session_limit = models.PositiveIntegerField(default=2)

    # Usage tracking
    active_days_used = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    purchased_at = models.DateTimeField(default=timezone.now)
    activated_at = models.DateTimeField(null=True, blank=True)
    first_used_at = models.DateTimeField(null=True, blank=True)
    last_active_date = models.DateField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"
        indexes = [
            models.Index(fields=["user", "status"], name="idx_sub_user_status"),
            models.Index(fields=["status", "expires_at"], name="idx_sub_status_expires"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(active_days_used__gte=0),
                name="subscription_days_used_nonnegative",
            ),
            models.CheckConstraint(
                check=models.Q(allowed_usage_days__isnull=True) | models.Q(allowed_usage_days__gt=0),
                name="subscription_allowed_days_positive",
            ),
            models.CheckConstraint(
                check=models.Q(allowed_usage_days__isnull=True)
                | models.Q(active_days_used__lte=models.F("allowed_usage_days")),
                name="subscription_usage_within_limit",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Subscription {self.id} ({self.user}) - {self.status}"

    @property
    def is_active_status(self):
        return self.status == self.Status.ACTIVE

    @property
    def remaining_usage_days(self):
        if self.plan_type != PlanType.USAGE_BASED or self.allowed_usage_days is None:
            return None
        return max(0, self.allowed_usage_days - self.active_days_used)


class SubscriptionPayment(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        AUTHORIZED = "authorized", "Authorized"
        CAPTURED = "captured", "Captured"
        REFUNDED = "refunded", "Refunded"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # In INR
    currency = models.CharField(max_length=3, default="INR")
    provider = models.CharField(max_length=30, default="razorpay")
    provider_order_id = models.CharField(max_length=150, null=True, blank=True)
    provider_payment_id = models.CharField(max_length=150, null=True, blank=True)
    provider_signature = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscription_payments"
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_payment_id"],
                name="unique_provider_payment_id",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} ({self.provider}) - {self.status}"


class InterviewSessionUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="session_usages",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="subscription_usages",
    )
    # 1:1 link with interview attempt ensures each interview attempt can only be counted once
    session = models.OneToOneField(
        "interview_sessions.Session",
        on_delete=models.CASCADE,
        related_name="subscription_usage",
    )
    usage_date = models.DateField(default=timezone.localdate, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_session_usages"
        indexes = [
            models.Index(fields=["subscription", "usage_date"], name="idx_usage_sub_date"),
            models.Index(fields=["user", "usage_date"], name="idx_usage_user_date"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Usage for Session {self.session_id} on {self.usage_date} ({self.user})"

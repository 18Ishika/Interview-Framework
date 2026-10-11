import uuid
from django.db import models
from django.utils import timezone
from users.models import User


class SubscriptionPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    included_usage_days = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscription_plans"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - ₹{self.price}"


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")

    price_paid = models.DecimalField(max_digits=10, decimal_places=2)
    allowed_usage_days = models.IntegerField(default=30)
    active_days_used = models.IntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    purchased_at = models.DateTimeField(default=timezone.now)
    activated_at = models.DateTimeField(null=True, blank=True)
    first_used_at = models.DateTimeField(null=True, blank=True)
    last_active_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"
        indexes = [
            models.Index(fields=["user", "status"], name="idx_sub_user_status"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(active_days_used__gte=0),
                name="subscription_days_used_nonnegative",
            ),
            models.CheckConstraint(
                check=models.Q(allowed_usage_days__gt=0),
                name="subscription_allowed_days_positive",
            ),
            models.CheckConstraint(
                check=models.Q(active_days_used__lte=models.F("allowed_usage_days")),
                name="subscription_usage_within_limit",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Subscription {self.id} ({self.user}) - {self.status}"


class SubscriptionPayment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("created", "Created"),
        ("authorized", "Authorized"),
        ("captured", "Captured"),
        ("refunded", "Refunded"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    provider = models.CharField(max_length=30, default="razorpay")
    provider_order_id = models.CharField(max_length=150, null=True, blank=True)
    provider_payment_id = models.CharField(max_length=150, null=True, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="created")
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

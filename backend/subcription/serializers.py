import uuid
from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, SubscriptionPayment


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "plan_type",
            "price",
            "included_usage_days",
            "duration_months",
            "duration_years",
            "daily_session_limit",
            "is_active",
        ]


class PurchasePlanRequestSerializer(serializers.Serializer):
    plan_id = serializers.UUIDField(required=True)


class VerifyPaymentRequestSerializer(serializers.Serializer):
    subscription_id = serializers.UUIDField(required=True)
    razorpay_order_id = serializers.CharField(max_length=150, required=True)
    razorpay_payment_id = serializers.CharField(max_length=150, required=True)
    razorpay_signature = serializers.CharField(max_length=255, required=True)


class CreateSessionRequestSerializer(serializers.Serializer):
    target_role = serializers.CharField(max_length=255, required=False, default="Software Engineer")
    session_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class SubscriptionStatusSerializer(serializers.Serializer):
    has_active_subscription = serializers.BooleanField()
    subscription_id = serializers.CharField(allow_null=True, required=False)
    plan_name = serializers.CharField(allow_null=True)
    plan_type = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    activated_at = serializers.DateTimeField(allow_null=True)
    expires_at = serializers.DateTimeField(allow_null=True)
    used_usage_days = serializers.IntegerField(allow_null=True)
    remaining_usage_days = serializers.IntegerField(allow_null=True)
    total_allowed_usage_days = serializers.IntegerField(allow_null=True)
    sessions_used_today = serializers.IntegerField()
    daily_session_limit = serializers.IntegerField()
    sessions_remaining_today = serializers.IntegerField()

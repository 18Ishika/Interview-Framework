from django.contrib import admin
from .models import (
    SubscriptionPlan,
    Subscription,
    SubscriptionPayment,
    InterviewSessionUsage,
)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "plan_type",
        "price",
        "included_usage_days",
        "duration_months",
        "duration_years",
        "daily_session_limit",
        "is_active",
        "created_at",
    )
    list_filter = ("plan_type", "is_active")
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "plan",
        "plan_type",
        "status",
        "price_paid",
        "active_days_used",
        "allowed_usage_days",
        "daily_session_limit",
        "activated_at",
        "expires_at",
    )
    list_filter = ("status", "plan_type", "plan")
    search_fields = ("user__email", "user__first_name", "user__last_name", "id")
    readonly_fields = ("created_at", "updated_at")


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "subscription",
        "amount",
        "currency",
        "provider",
        "provider_order_id",
        "provider_payment_id",
        "status",
        "created_at",
    )
    list_filter = ("status", "provider", "currency")
    search_fields = ("provider_order_id", "provider_payment_id", "subscription__id")
    readonly_fields = ("created_at", "updated_at")


@admin.register(InterviewSessionUsage)
class InterviewSessionUsageAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "subscription", "session", "usage_date", "created_at")
    list_filter = ("usage_date",)
    search_fields = ("user__email", "session__id", "subscription__id")
    readonly_fields = ("created_at",)

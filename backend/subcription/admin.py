from django.contrib import admin
from .models import SubscriptionPlan, Subscription, SubscriptionPayment


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "included_usage_days", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "plan", "status", "price_paid", "active_days_used", "allowed_usage_days", "purchased_at")
    list_filter = ("status", "plan")
    search_fields = ("user__email", "user__first_name", "user__last_name", "id")


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "subscription", "amount", "currency", "provider", "provider_payment_id", "status", "created_at")
    list_filter = ("status", "provider", "currency")
    search_fields = ("provider_order_id", "provider_payment_id", "subscription__id")

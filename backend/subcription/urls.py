from django.urls import path
from .views import (
    SubscriptionPlanListView,
    SubscriptionPurchaseView,
    SubscriptionVerifyPaymentView,
    SubscriptionMeView,
    CreateInterviewSessionView,
)

urlpatterns = [
    path("plans/", SubscriptionPlanListView.as_view(), name="subscription-plans"),
    path("purchase/", SubscriptionPurchaseView.as_view(), name="subscription-purchase"),
    path("verify-payment/", SubscriptionVerifyPaymentView.as_view(), name="subscription-verify-payment"),
    path("me/", SubscriptionMeView.as_view(), name="subscription-me"),
    path("create-session/", CreateInterviewSessionView.as_view(), name="subscription-create-session"),
]

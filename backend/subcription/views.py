import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework.exceptions import ValidationError, PermissionDenied

from users.authentication import ClerkAuthentication
from .models import SubscriptionPlan
from .serializers import (
    SubscriptionPlanSerializer,
    PurchasePlanRequestSerializer,
    VerifyPaymentRequestSerializer,
    CreateSessionRequestSerializer,
    SubscriptionStatusSerializer,
)
from .services import SubscriptionService, EntitlementError

logger = logging.getLogger(__name__)


class BaseSubscriptionView(APIView):
    authentication_classes = [ClerkAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]


class PlanBurstThrottle(UserRateThrottle):
    rate = "60/min"


class PaymentBurstThrottle(UserRateThrottle):
    rate = "20/min"


class SubscriptionPlanListView(APIView):
    """
    GET /api/subscriptions/plans/
    Public/Authenticated list of active subscription plans.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, PlanBurstThrottle]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by("price")
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response({
            "success": True,
            "plans": serializer.data,
        }, status=status.HTTP_200_OK)


class SubscriptionPurchaseView(BaseSubscriptionView):
    """
    POST /api/subscriptions/purchase/
    Initiates subscription purchase and returns Razorpay order details.
    Enforces one usable subscription per student at a time.
    """
    throttle_classes = [PaymentBurstThrottle]

    def post(self, request):
        serializer = PurchasePlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan_id = serializer.validated_data["plan_id"]
        try:
            purchase_data = SubscriptionService.initiate_purchase(
                user=request.user,
                plan_id=plan_id,
            )
            return Response({
                "success": True,
                "data": purchase_data,
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({
                "success": False,
                "error": str(e.detail[0] if isinstance(e.detail, list) else e.detail),
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in SubscriptionPurchaseView: {str(e)}")
            return Response({
                "success": False,
                "error": "Failed to initiate purchase. Please try again later.",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionVerifyPaymentView(BaseSubscriptionView):
    """
    POST /api/subscriptions/verify-payment/
    Verifies Razorpay payment signature server-side and activates the subscription.
    Idempotent.
    """
    throttle_classes = [PaymentBurstThrottle]

    def post(self, request):
        serializer = VerifyPaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vd = serializer.validated_data
        try:
            result = SubscriptionService.verify_payment(
                user=request.user,
                subscription_id=vd["subscription_id"],
                razorpay_order_id=vd["razorpay_order_id"],
                razorpay_payment_id=vd["razorpay_payment_id"],
                razorpay_signature=vd["razorpay_signature"],
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            error_msg = str(e.detail[0] if isinstance(e.detail, list) else e.detail)
            return Response({
                "success": False,
                "error": error_msg,
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in SubscriptionVerifyPaymentView: {str(e)}")
            return Response({
                "success": False,
                "error": "Payment verification failed. Please contact support.",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionMeView(BaseSubscriptionView):
    """
    GET /api/subscriptions/me/
    Returns currently active subscription, limits, and usage status.
    """
    def get(self, request):
        data = SubscriptionService.get_user_subscription_status(request.user)
        serializer = SubscriptionStatusSerializer(data)
        return Response({
            "success": True,
            "subscription": serializer.data,
        }, status=status.HTTP_200_OK)


class CreateInterviewSessionView(BaseSubscriptionView):
    """
    POST /api/subscriptions/create-session/
    Protected endpoint to create an interview session after validating subscription entitlements.
    Consumes 1 session entitlement.
    """
    def post(self, request):
        serializer = CreateSessionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_role = serializer.validated_data.get("target_role", "Software Engineer")
        session_id = serializer.validated_data.get("session_id")

        try:
            session = SubscriptionService.create_interview_session(
                user=request.user,
                target_role=target_role,
                session_id=session_id,
            )
            return Response({
                "success": True,
                "session_id": str(session.id),
                "target_role": session.target_role,
                "overall_status": session.overall_status,
                "message": "Interview session created and entitlement verified.",
            }, status=status.HTTP_201_CREATED)
        except EntitlementError as e:
            return Response({
                "success": False,
                "error": str(e),
                "entitlement_exceeded": True,
            }, status=status.HTTP_403_FORBIDDEN)
        except PermissionDenied as e:
            return Response({
                "success": False,
                "error": str(e),
                "entitlement_exceeded": True,
            }, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error in CreateInterviewSessionView: {str(e)}")
            return Response({
                "success": False,
                "error": "Failed to create session. Please try again.",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

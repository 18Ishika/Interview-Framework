import datetime
import hashlib
import hmac
import uuid
from decimal import Decimal
from unittest.mock import patch

from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from interview_sessions.models import Session
from users.models import User
from .models import (
    SubscriptionPlan,
    Subscription,
    SubscriptionPayment,
    InterviewSessionUsage,
    PlanType,
)
from .services import SubscriptionService, RazorpayService, EntitlementError


class SubscriptionSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create test users
        self.user1 = User.objects.create(
            clerk_user_id="user_clerk_1",
            first_name="Rohan",
            last_name="Sharma",
            email="rohan@example.com",
            role="candidate",
        )
        self.user2 = User.objects.create(
            clerk_user_id="user_clerk_2",
            first_name="Priya",
            last_name="Patel",
            email="priya@example.com",
            role="candidate",
        )

        # Ensure all four standard plans exist
        self.plan_plus, _ = SubscriptionPlan.objects.get_or_create(
            name="Student Plus",
            defaults={
                "plan_type": PlanType.USAGE_BASED,
                "price": Decimal("499.00"),
                "included_usage_days": 30,
                "daily_session_limit": 2,
                "is_active": True,
            },
        )
        self.plan_pro, _ = SubscriptionPlan.objects.get_or_create(
            name="Student Pro",
            defaults={
                "plan_type": PlanType.USAGE_BASED,
                "price": Decimal("999.00"),
                "included_usage_days": 30,
                "daily_session_limit": 5,
                "is_active": True,
            },
        )
        self.plan_monthly, _ = SubscriptionPlan.objects.get_or_create(
            name="Monthly Plan",
            defaults={
                "plan_type": PlanType.CALENDAR_BASED,
                "price": Decimal("1499.00"),
                "duration_months": 1,
                "daily_session_limit": 10,
                "is_active": True,
            },
        )
        self.plan_yearly, _ = SubscriptionPlan.objects.get_or_create(
            name="Yearly Plan",
            defaults={
                "plan_type": PlanType.CALENDAR_BASED,
                "price": Decimal("9999.00"),
                "duration_years": 1,
                "daily_session_limit": 10,
                "is_active": True,
            },
        )

    # =========================================================================
    # 1. Plan Configuration Tests
    # =========================================================================

    def test_all_four_plans_configuration(self):
        """Verifies the four plan types, validity, limits, and configurations."""
        self.assertEqual(self.plan_plus.plan_type, PlanType.USAGE_BASED)
        self.assertEqual(self.plan_plus.included_usage_days, 30)
        self.assertEqual(self.plan_plus.daily_session_limit, 2)
        self.assertIsNone(self.plan_plus.duration_months)

        self.assertEqual(self.plan_pro.plan_type, PlanType.USAGE_BASED)
        self.assertEqual(self.plan_pro.included_usage_days, 30)
        self.assertEqual(self.plan_pro.daily_session_limit, 5)

        self.assertEqual(self.plan_monthly.plan_type, PlanType.CALENDAR_BASED)
        self.assertEqual(self.plan_monthly.duration_months, 1)
        self.assertEqual(self.plan_monthly.daily_session_limit, 10)
        self.assertIsNone(self.plan_monthly.included_usage_days)

        self.assertEqual(self.plan_yearly.plan_type, PlanType.CALENDAR_BASED)
        self.assertEqual(self.plan_yearly.duration_years, 1)
        self.assertEqual(self.plan_yearly.daily_session_limit, 10)
        self.assertIsNone(self.plan_yearly.included_usage_days)

    def test_plans_api_listing(self):
        """GET /api/subscriptions/plans/ returns all active plans."""
        response = self.client.get("/api/subscriptions/plans/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        plan_names = [p["name"] for p in response.data["plans"]]
        self.assertIn("Student Plus", plan_names)
        self.assertIn("Student Pro", plan_names)
        self.assertIn("Monthly Plan", plan_names)
        self.assertIn("Yearly Plan", plan_names)

    # =========================================================================
    # 2. Purchase and Snapshot Terms Tests
    # =========================================================================

    def test_purchase_creates_pending_subscription_snapshot(self):
        """Subscription captures an immutable snapshot of purchased plan terms."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/subscriptions/purchase/", {"plan_id": str(self.plan_plus.id)})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

        sub_id = response.data["data"]["subscription_id"]
        sub = Subscription.objects.get(id=sub_id)
        self.assertEqual(sub.status, Subscription.Status.PENDING)
        self.assertEqual(sub.plan_type, PlanType.USAGE_BASED)
        self.assertEqual(sub.price_paid, self.plan_plus.price)
        self.assertEqual(sub.allowed_usage_days, 30)
        self.assertEqual(sub.daily_session_limit, 2)

        # Modifying plan afterward does not alter purchased subscription
        self.plan_plus.daily_session_limit = 99
        self.plan_plus.save()
        sub.refresh_from_db()
        self.assertEqual(sub.daily_session_limit, 2)

    def test_cannot_purchase_while_having_active_subscription(self):
        """Enforces one usable subscription per student at a time."""
        # Create and activate an active subscription for user1
        Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            daily_session_limit=2,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/subscriptions/purchase/", {"plan_id": str(self.plan_pro.id)})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already have an active subscription", response.data["error"])

    # =========================================================================
    # 3. Payment Verification & Security Tests
    # =========================================================================

    @override_settings(RAZORPAY_KEY_SECRET="test_secret_for_unit_tests")
    def test_payment_verification_success_and_idempotency(self):
        """Tests server-side HMAC signature verification and idempotency."""
        secret = "test_secret_for_unit_tests"
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_monthly,
            plan_type=PlanType.CALENDAR_BASED,
            price_paid=self.plan_monthly.price,
            duration_months=1,
            daily_session_limit=10,
            status=Subscription.Status.PENDING,
        )
        payment = SubscriptionPayment.objects.create(
            subscription=sub,
            amount=self.plan_monthly.price,
            currency="INR",
            provider="razorpay",
            provider_order_id="order_test_12345",
            status=SubscriptionPayment.Status.CREATED,
        )

        order_id = "order_test_12345"
        payment_id = "pay_test_67890"
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        valid_signature = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        self.client.force_authenticate(user=self.user1)
        # First verification call
        res = self.client.post("/api/subscriptions/verify-payment/", {
            "subscription_id": str(sub.id),
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_signature,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertIsNotNone(sub.activated_at)
        self.assertIsNotNone(sub.expires_at)
        # Calendar expiration must be 1 month from activated_at
        expected_expiry = sub.activated_at + relativedelta(months=1)
        self.assertEqual(sub.expires_at.date(), expected_expiry.date())

        # Second verification call (idempotent replay)
        res_replay = self.client.post("/api/subscriptions/verify-payment/", {
            "subscription_id": str(sub.id),
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_signature,
        })
        self.assertEqual(res_replay.status_code, status.HTTP_200_OK)
        self.assertIn("already verified", res_replay.data["message"])

    @override_settings(RAZORPAY_KEY_SECRET="test_secret_for_unit_tests")
    def test_payment_verification_forged_signature_fails(self):
        """Forged signatures are rejected server-side."""
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            status=Subscription.Status.PENDING,
        )
        SubscriptionPayment.objects.create(
            subscription=sub,
            amount=self.plan_plus.price,
            currency="INR",
            provider="razorpay",
            provider_order_id="order_fake_111",
            status=SubscriptionPayment.Status.CREATED,
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.post("/api/subscriptions/verify-payment/", {
            "subscription_id": str(sub.id),
            "razorpay_order_id": "order_fake_111",
            "razorpay_payment_id": "pay_fake_222",
            "razorpay_signature": "invalid_forged_signature_123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.PENDING)

    def test_cross_user_payment_tampering_forbidden(self):
        """User 2 cannot verify or tamper with User 1's subscription."""
        sub1 = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            price_paid=self.plan_plus.price,
            status=Subscription.Status.PENDING,
        )
        self.client.force_authenticate(user=self.user2)
        res = self.client.post("/api/subscriptions/verify-payment/", {
            "subscription_id": str(sub1.id),
            "razorpay_order_id": "order_x",
            "razorpay_payment_id": "pay_x",
            "razorpay_signature": "sig_x",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 4. Usage-based Plan: Days Counting and Daily Limits
    # =========================================================================

    def test_usage_day_counted_only_once_per_calendar_date(self):
        """Starting multiple interview sessions on the same calendar date consumes only 1 usage day."""
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_pro,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_pro.price,
            allowed_usage_days=30,
            daily_session_limit=5,
            active_days_used=0,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        # 1st session today
        s1 = Session.objects.create(user=self.user1, target_role="SWE")
        SubscriptionService.consume_session_entitlement(self.user1, s1)
        sub.refresh_from_db()
        self.assertEqual(sub.active_days_used, 1)
        self.assertEqual(sub.last_active_date, timezone.localdate())

        # 2nd session today
        s2 = Session.objects.create(user=self.user1, target_role="SWE")
        SubscriptionService.consume_session_entitlement(self.user1, s2)
        sub.refresh_from_db()
        # active_days_used is STILL 1
        self.assertEqual(sub.active_days_used, 1)

    def test_student_plus_daily_session_limit_of_two(self):
        """Student Plus allows max 2 sessions per date."""
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            daily_session_limit=2,
            active_days_used=0,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        s1 = Session.objects.create(user=self.user1)
        SubscriptionService.consume_session_entitlement(self.user1, s1)

        s2 = Session.objects.create(user=self.user1)
        SubscriptionService.consume_session_entitlement(self.user1, s2)

        # 3rd session on same date must be rejected
        s3 = Session.objects.create(user=self.user1)
        with self.assertRaises(EntitlementError) as ctx:
            SubscriptionService.consume_session_entitlement(self.user1, s3)
        self.assertIn("daily session limit of 2", str(ctx.exception))

    def test_student_pro_daily_session_limit_of_five(self):
        """Student Pro allows max 5 sessions per date."""
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_pro,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_pro.price,
            allowed_usage_days=30,
            daily_session_limit=5,
            active_days_used=0,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        for i in range(5):
            s = Session.objects.create(user=self.user1)
            SubscriptionService.consume_session_entitlement(self.user1, s)

        # 6th session must be rejected
        s6 = Session.objects.create(user=self.user1)
        with self.assertRaises(EntitlementError):
            SubscriptionService.consume_session_entitlement(self.user1, s6)

    def test_usage_limit_reached_after_thirty_days(self):
        """After 30 distinct usage days, deny new sessions."""
        yesterday = timezone.localdate() - datetime.timedelta(days=1)
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            daily_session_limit=2,
            active_days_used=30,  # All 30 days used
            last_active_date=yesterday,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        s = Session.objects.create(user=self.user1)
        with self.assertRaises(EntitlementError) as ctx:
            SubscriptionService.consume_session_entitlement(self.user1, s)
        self.assertIn("completed all 30 active usage days", str(ctx.exception))
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.EXPIRED)

    # =========================================================================
    # 5. Calendar-based Plan Tests: Monthly and Yearly Expiration
    # =========================================================================

    def test_monthly_plan_expiration_and_daily_limit_ten(self):
        """Monthly plan grants 10 sessions/day within 1 month validity."""
        now = timezone.now()
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_monthly,
            plan_type=PlanType.CALENDAR_BASED,
            price_paid=self.plan_monthly.price,
            duration_months=1,
            daily_session_limit=10,
            status=Subscription.Status.ACTIVE,
            activated_at=now,
            expires_at=now + relativedelta(months=1),
        )

        # Can consume up to 10
        for _ in range(10):
            s = Session.objects.create(user=self.user1)
            SubscriptionService.consume_session_entitlement(self.user1, s)

        # 11th on same day fails
        s11 = Session.objects.create(user=self.user1)
        with self.assertRaises(EntitlementError) as ctx:
            SubscriptionService.consume_session_entitlement(self.user1, s11)
        self.assertIn("daily session limit of 10", str(ctx.exception))

    def test_yearly_plan_expiration(self):
        """Expired calendar plan denies new sessions."""
        past_activated = timezone.now() - relativedelta(years=1, days=1)
        past_expired = past_activated + relativedelta(years=1)
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_yearly,
            plan_type=PlanType.CALENDAR_BASED,
            price_paid=self.plan_yearly.price,
            duration_years=1,
            daily_session_limit=10,
            status=Subscription.Status.ACTIVE,
            activated_at=past_activated,
            expires_at=past_expired,
        )

        s = Session.objects.create(user=self.user1)
        with self.assertRaises(EntitlementError) as ctx:
            SubscriptionService.consume_session_entitlement(self.user1, s)
        self.assertIn("expired", str(ctx.exception).lower())
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.EXPIRED)

    # =========================================================================
    # 6. Duplicate Session Attempts & Idempotency
    # =========================================================================

    def test_duplicate_session_attempts_do_not_consume_multiple_sessions(self):
        """One interview session attempt containing coding/tech/hr rounds consumes only 1 entitlement."""
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            daily_session_limit=2,
            active_days_used=0,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        session = Session.objects.create(user=self.user1)

        # First consumption (e.g. coding round started)
        success1, msg1, _ = SubscriptionService.consume_session_entitlement(self.user1, session)
        self.assertTrue(success1)
        self.assertEqual(InterviewSessionUsage.objects.filter(session=session).count(), 1)

        # Second request on same session (e.g. technical round started or API retry)
        success2, msg2, _ = SubscriptionService.consume_session_entitlement(self.user1, session)
        self.assertTrue(success2)
        # Usage records count is still 1
        self.assertEqual(InterviewSessionUsage.objects.filter(session=session).count(), 1)
        self.assertEqual(sub.session_usages.count(), 1)

    # =========================================================================
    # 7. Current Subscription Status API (/api/subscriptions/me/)
    # =========================================================================

    def test_subscription_me_api_endpoint(self):
        """GET /api/subscriptions/me/ returns all required status attributes."""
        sub = Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            daily_session_limit=2,
            active_days_used=1,
            last_active_date=timezone.localdate(),
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )
        s = Session.objects.create(user=self.user1)
        InterviewSessionUsage.objects.create(
            subscription=sub,
            user=self.user1,
            session=s,
            usage_date=timezone.localdate(),
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.get("/api/subscriptions/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["subscription"]
        self.assertTrue(data["has_active_subscription"])
        self.assertEqual(data["plan_name"], "Student Plus")
        self.assertEqual(data["plan_type"], "usage_based")
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["used_usage_days"], 1)
        self.assertEqual(data["remaining_usage_days"], 29)
        self.assertEqual(data["total_allowed_usage_days"], 30)
        self.assertEqual(data["sessions_used_today"], 1)
        self.assertEqual(data["daily_session_limit"], 2)
        self.assertEqual(data["sessions_remaining_today"], 1)

    # =========================================================================
    # 8. Create Interview Session Protected Endpoint
    # =========================================================================

    def test_create_session_endpoint_with_entitlement(self):
        """POST /api/subscriptions/create-session/ creates session and consumes entitlement."""
        Subscription.objects.create(
            user=self.user1,
            plan=self.plan_plus,
            plan_type=PlanType.USAGE_BASED,
            price_paid=self.plan_plus.price,
            allowed_usage_days=30,
            daily_session_limit=2,
            status=Subscription.Status.ACTIVE,
            activated_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.post("/api/subscriptions/create-session/", {"target_role": "Backend Engineer"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["success"])
        session_id = res.data["session_id"]
        self.assertTrue(Session.objects.filter(id=session_id).exists())
        self.assertTrue(InterviewSessionUsage.objects.filter(session_id=session_id).exists())

    def test_create_session_endpoint_denies_unsubscribed_user(self):
        """User without active subscription is denied."""
        self.client.force_authenticate(user=self.user2)
        res = self.client.post("/api/subscriptions/create-session/", {})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(res.data["entitlement_exceeded"])

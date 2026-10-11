import { API_BASE } from '../lib/config';

/**
 * Fetch all active subscription plans from the backend.
 */
export async function fetchSubscriptionPlans() {
  const res = await fetch(`${API_BASE}/subscriptions/plans/`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load subscription plans');
  return data.plans || [];
}

/**
 * Fetch current user's active subscription, limits, and usage status.
 */
export async function fetchMySubscription(getToken) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/subscriptions/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load user subscription');
  return data.subscription;
}

/**
 * Initiate purchase for a chosen plan.
 */
export async function initiatePlanPurchase(planId, getToken) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/subscriptions/purchase/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_id: planId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to initiate purchase');
  return data.data;
}

/**
 * Verify Razorpay payment signature server-side.
 */
export async function verifyPlanPayment(payload, getToken) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/subscriptions/verify-payment/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment verification failed');
  return data;
}

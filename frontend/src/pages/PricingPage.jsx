import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import Navbar from '../components/common/Navbar';
import {
  fetchSubscriptionPlans,
  fetchMySubscription,
  initiatePlanPurchase,
  verifyPlanPayment,
} from '../api/subscriptionApi';
import './PricingPage.css';

// Fallback plans if API is slow or offline
const DEFAULT_PLANS = [
  {
    id: 'plan_student_plus',
    name: 'Student Plus',
    plan_type: 'usage_based',
    price: '499.00',
    included_usage_days: 30,
    daily_session_limit: 2,
    description: 'Perfect for upcoming placement season. Count days only when you actively practice.',
    features: [
      '30 Active Usage Days (never expires until used)',
      '2 Complete Interview Sessions / Day',
      'All 3 Rounds: Coding, Technical & HR',
      'Judge0 Test Case Evaluation (Python, Java, C++)',
      'AI Speech & Technical Answer Scoring',
      'Instant Performance Breakdown',
    ],
    tag: 'Popular for Placements',
    tagClass: '',
    featured: false,
  },
  {
    id: 'plan_student_pro',
    name: 'Student Pro',
    plan_type: 'usage_based',
    price: '999.00',
    included_usage_days: 30,
    daily_session_limit: 5,
    description: 'High-frequency practice with 5 attempts every usage day for dream job preparation.',
    features: [
      '30 Active Usage Days (paused when inactive)',
      '5 Complete Interview Sessions / Day',
      'Coding + AI Technical + HR Rounds',
      'Deep Posture, Eye Contact & Voice Metrics',
      'AI Behavioral & Q&A Analysis',
      'Priority Report Evaluation & IQ Card',
    ],
    tag: '⭐ Best for Intensive Prep',
    tagClass: '',
    featured: true,
  },
  {
    id: 'plan_monthly',
    name: 'Monthly Plan',
    plan_type: 'calendar_based',
    price: '1499.00',
    duration_months: 1,
    daily_session_limit: 10,
    description: 'Unlimited 30-day access with up to 10 sessions every single day.',
    features: [
      '1 Full Calendar Month Validity',
      '10 Complete Sessions Every Day',
      'Resets Daily at Midnight (IST)',
      'Full Question Banks & LeetCode-style Questions',
      'Comprehensive Multi-Round Analytics',
      'Unlimited Re-takes & Mock Interviews',
    ],
    tag: 'All-Access Pass',
    tagClass: '',
    featured: false,
  },
  {
    id: 'plan_yearly',
    name: 'Yearly Plan',
    plan_type: 'calendar_based',
    price: '9999.00',
    duration_years: 1,
    daily_session_limit: 10,
    description: 'Full year of unlimited preparation for off-campus drives, internships, and placements.',
    features: [
      '365 Days All-Access Validity',
      '10 Complete Sessions Every Day',
      'Complete Placement & Tech Readiness',
      'All Future Rounds, Datasets & AI Features Included',
      'Official InterviewIQ Certified Card & Profile',
      'Save over 45% compared to monthly renewal',
    ],
    tag: '🏆 Best Value • Save 45%',
    tagClass: 'plan-card-tag--gold',
    featured: false,
  },
];

const FAQS = [
  {
    q: 'How do "30 Active Usage Days" work on Student Plus and Pro?',
    a: 'Unlike traditional subscriptions that expire in 30 calendar days, our usage-based plans count a day ONLY when you actually start an interview. If you practice on Monday, take a break Tuesday and Wednesday, and practice again on Thursday, you have only consumed 2 usage days. You retain full control over your preparation timeline!',
  },
  {
    q: 'What counts as an interview session?',
    a: 'A single session means one full interview attempt containing all three rounds: Coding Round, AI Technical Interview, and HR Interview. Switching between rounds or revisiting test results within the same attempt does NOT deduct extra sessions.',
  },
  {
    q: 'How do daily session limits reset?',
    a: 'Daily limits reset automatically at midnight in Indian Standard Time (Asia/Kolkata). For instance, on the Student Plus plan, you can take 2 full interviews today, and another 2 tomorrow on your next practice day.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'We support all major Indian payment methods through Razorpay: UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit cards (Visa, MasterCard, RuPay), and Net Banking across 50+ Indian banks.',
  },
  {
    q: 'Can I purchase another plan while my current one is active?',
    a: 'To protect your investment and prevent accidental double charges, each student can have one active subscription at a time. Once your current plan is completed or expired, you can seamlessly upgrade or switch.',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [currentSub, setCurrentSub] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'usage_based', 'calendar_based'
  const [openFaq, setOpenFaq] = useState(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    if (!document.getElementById('razorpay-sdk')) {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch plans from backend API
  useEffect(() => {
    async function loadData() {
      try {
        const backendPlans = await fetchSubscriptionPlans();
        if (backendPlans && backendPlans.length > 0) {
          // Merge API data with enhanced presentation attributes
          const merged = backendPlans.map((bp) => {
            const def = DEFAULT_PLANS.find((d) => d.name.toLowerCase() === bp.name.toLowerCase()) || {};
            return {
              ...def,
              ...bp,
              price: bp.price ? String(bp.price) : def.price,
              tag: def.tag || (bp.plan_type === 'calendar_based' ? 'All-Access' : 'Placement Plan'),
              tagClass: def.tagClass || '',
              featured: def.featured || false,
              features: def.features || [
                `${bp.daily_session_limit} Full Sessions / Day`,
                'Coding, Technical & HR Rounds Included',
                'AI Speech & Answer Evaluation',
                'Performance Report & Scoring',
              ],
            };
          });
          setPlans(merged);
        }
      } catch (err) {
        console.warn('Using default plans due to API warning:', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadData();
  }, []);

  // Fetch current user subscription if signed in
  useEffect(() => {
    if (!isSignedIn) return;
    async function loadSub() {
      try {
        const sub = await fetchMySubscription(getToken);
        setCurrentSub(sub);
      } catch (e) {
        console.log('User has no active subscription yet:', e);
      }
    }
    loadSub();
  }, [isSignedIn, getToken]);

  const handleSelectPlan = async (plan) => {
    setErrorMsg(null);

    // If not signed in, guide them to login
    if (!isSignedIn) {
      navigate('/login');
      return;
    }

    // Check if user already has an active subscription
    if (currentSub?.has_active_subscription) {
      setErrorMsg(
        `You currently have an active ${currentSub.plan_name} plan. You cannot purchase another plan until your current subscription expires.`
      );
      return;
    }

    setPurchasingPlanId(plan.id);

    try {
      // 1. Call backend purchase endpoint
      const orderData = await initiatePlanPurchase(plan.id, getToken);

      const razorpayKey = orderData.key_id;

      // 2. Open Razorpay Checkout modal if live keys exist and script is loaded
      if (window.Razorpay && razorpayKey && !razorpayKey.startsWith('mock_')) {
        const options = {
          key: razorpayKey,
          amount: Math.round(orderData.amount * 100),
          currency: 'INR',
          name: 'Interview IQ',
          description: `${plan.name} Subscription`,
          order_id: orderData.order_id,
          handler: async (response) => {
            try {
              const verifyRes = await verifyPlanPayment(
                {
                  subscription_id: orderData.subscription_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                getToken
              );
              setSuccessModal({
                planName: plan.name,
                message: 'Your subscription has been activated successfully! You can now start interview sessions.',
              });
              // Refresh user subscription status
              const updatedSub = await fetchMySubscription(getToken);
              setCurrentSub(updatedSub);
            } catch (verErr) {
              setErrorMsg(verErr.message || 'Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            email: user?.primaryEmailAddress?.emailAddress || '',
          },
          theme: {
            color: '#D4A373',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (failResp) => {
          setErrorMsg(failResp.error?.description || 'Payment failed. Please try again.');
        });
        rzp.open();
      } else {
        // Fallback for development / mock payment verification
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSig = 'test_valid_signature';
        await verifyPlanPayment(
          {
            subscription_id: orderData.subscription_id,
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: mockSig,
          },
          getToken
        );

        setSuccessModal({
          planName: plan.name,
          message: 'Payment verified and plan activated successfully in test/mock mode!',
        });
        const updatedSub = await fetchMySubscription(getToken);
        setCurrentSub(updatedSub);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initialize subscription checkout. Please try again.');
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (activeTab === 'all') return true;
    return p.plan_type === activeTab;
  });

  return (
    <div className="pricing-page" id="pricing-page-root">
      {/* Platform Navigation */}
      <Navbar />

      <main className="pricing-container">
        {/* Hero Section */}
        <header className="pricing-hero">
          <div className="pricing-eyebrow" id="pricing-badge">
            <i className="ti ti-shield-check" />
            Transparent Pricing for Indian Students
          </div>
          <h1 className="pricing-title">
            Invest in your <span className="pricing-title-accent">dream career</span>
          </h1>
          <p className="pricing-subtitle">
            Tailored specifically for campus drives and tech placements. Choose between flexible 30 active usage days or
            unlimited calendar periods.
          </p>

          {/* Plan Filter Switcher */}
          <div className="pricing-toggle-wrap">
            <div className="pricing-toggle-box" role="tablist">
              <button
                id="pricing-tab-all"
                className={`pricing-toggle-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Plans
              </button>
              <button
                id="pricing-tab-usage"
                className={`pricing-toggle-btn ${activeTab === 'usage_based' ? 'active' : ''}`}
                onClick={() => setActiveTab('usage_based')}
              >
                Usage-Based (30 Days)
                <span className="pricing-toggle-badge">Paused when idle</span>
              </button>
              <button
                id="pricing-tab-calendar"
                className={`pricing-toggle-btn ${activeTab === 'calendar_based' ? 'active' : ''}`}
                onClick={() => setActiveTab('calendar_based')}
              >
                Calendar Access (Monthly / Yearly)
              </button>
            </div>
          </div>
        </header>

        {/* Error notification banner if any */}
        {errorMsg && (
          <div
            style={{
              maxWidth: 780,
              margin: '0 auto 32px',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(196, 87, 79, 0.12)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '18px' }} />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {/* Active Subscription Banner for logged-in students */}
        {currentSub?.has_active_subscription && (
          <section className="current-sub-banner" id="current-subscription-banner">
            <div className="current-sub-info">
              <div className="current-sub-icon">
                <i className="ti ti-crown" />
              </div>
              <div className="current-sub-text">
                <h4>
                  You have an active <strong>{currentSub.plan_name}</strong> plan
                </h4>
                <p>
                  {currentSub.plan_type === 'usage_based'
                    ? `${currentSub.remaining_usage_days} active days remaining of ${currentSub.total_allowed_usage_days} days.`
                    : `Expires on ${new Date(currentSub.expires_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}.`}
                </p>
              </div>
            </div>

            <div className="current-sub-stats">
              <span className="sub-stat-chip">
                Today: {currentSub.sessions_used_today} / {currentSub.daily_session_limit} sessions used
              </span>
              <button
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
                onClick={() => navigate('/interview')}
              >
                Start Interview
              </button>
            </div>
          </section>
        )}

        {/* Pricing Cards Grid */}
        <section className="plans-grid" id="pricing-cards-grid">
          {filteredPlans.map((plan) => {
            const isCurrentPlan = currentSub?.has_active_subscription && currentSub.plan_name === plan.name;
            const isProcessing = purchasingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                id={`plan-card-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`plan-card ${plan.featured ? 'plan-card--featured' : ''}`}
              >
                {/* Floating Tag */}
                {plan.tag && <div className={`plan-card-tag ${plan.tagClass || ''}`}>{plan.tag}</div>}

                <div className="plan-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <span className="plan-badge-type">
                    {plan.plan_type === 'usage_based' ? '30 Active Days' : plan.duration_years ? '1 Year Access' : '1 Month Access'}
                  </span>

                  <div className="plan-price-wrap">
                    <span className="plan-currency">₹</span>
                    <span className="plan-price">{Math.round(Number(plan.price)).toLocaleString('en-IN')}</span>
                    <span className="plan-period">
                      {plan.plan_type === 'usage_based' ? '/ 30 active days' : plan.duration_years ? '/ year' : '/ month'}
                    </span>
                  </div>

                  <p className="plan-description">{plan.description}</p>
                </div>

                <div className="plan-divider" />

                <ul className="plan-features">
                  {plan.features?.map((feat, idx) => (
                    <li key={idx} className="plan-feature-item">
                      <i className="ti ti-circle-check-filled plan-feature-icon" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  id={`buy-btn-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`plan-btn ${plan.featured ? 'plan-btn--primary' : ''} ${
                    isCurrentPlan ? 'plan-btn--active' : ''
                  }`}
                  disabled={isCurrentPlan || isProcessing}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isProcessing ? (
                    <>
                      <i className="ti ti-loader ti-spin" /> Preparing checkout...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Active Plan'
                  ) : (
                    `Get ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </section>

        {/* Feature Comparison Table */}
        <section className="pricing-table-section">
          <div className="pricing-table-header">
            <h2 className="pricing-table-title">Plan Comparison at a Glance</h2>
            <p className="pricing-table-sub">
              Every single plan grants access to all three rounds (Coding, Technical, and HR) with zero hidden fees.
            </p>
          </div>

          <div className="table-responsive">
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Features</th>
                  <th>Student Plus</th>
                  <th>Student Pro</th>
                  <th>Monthly Plan</th>
                  <th>Yearly Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Plan Model</td>
                  <td>30 Active Usage Days</td>
                  <td>30 Active Usage Days</td>
                  <td>1 Calendar Month</td>
                  <td>1 Calendar Year</td>
                </tr>
                <tr>
                  <td>Daily Session Limit</td>
                  <td>
                    <strong>2 Full Attempts / Day</strong>
                  </td>
                  <td>
                    <strong>5 Full Attempts / Day</strong>
                  </td>
                  <td>
                    <strong>10 Full Attempts / Day</strong>
                  </td>
                  <td>
                    <strong>10 Full Attempts / Day</strong>
                  </td>
                </tr>
                <tr>
                  <td>Coding Round (Judge0)</td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                </tr>
                <tr>
                  <td>AI Technical Round</td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                </tr>
                <tr>
                  <td>AI HR Interview</td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                  <td><i className="ti ti-check" style={{ color: 'var(--color-success)' }} /></td>
                </tr>
                <tr>
                  <td>Posture, Eye Contact & Voice</td>
                  <td>Basic Feedback</td>
                  <td><span className="comp-badge" style={{ background: 'var(--color-bg-tertiary)' }}>Advanced Metrics</span></td>
                  <td><span className="comp-badge" style={{ background: 'var(--color-bg-tertiary)' }}>Advanced Metrics</span></td>
                  <td><span className="comp-badge" style={{ background: 'var(--color-bg-tertiary)' }}>Advanced Metrics</span></td>
                </tr>
                <tr>
                  <td>Interview IQ Credential Card</td>
                  <td>Standard</td>
                  <td>Verified</td>
                  <td>Verified</td>
                  <td>Verified + Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="pricing-faq-section">
          <h2 className="pricing-faq-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  id={`faq-item-${idx}`}
                  className={`faq-card ${isOpen ? 'open' : ''}`}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <div className="faq-question">
                    <span>{faq.q}</span>
                    <i className="ti ti-chevron-down faq-icon" />
                  </div>
                  {isOpen && <p className="faq-answer">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Success Modal */}
      {successModal && (
        <div className="modal-overlay" onClick={() => setSuccessModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <i className="ti ti-circle-check" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: '0 0 10px' }}>
              Welcome to {successModal.planName}!
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px' }}>
              {successModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setSuccessModal(null);
                  navigate('/interview');
                }}
              >
                Go to Interview Setup
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSuccessModal(null);
                  navigate('/dashboard');
                }}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

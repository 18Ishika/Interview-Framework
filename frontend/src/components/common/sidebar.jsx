import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { fetchMySubscription } from '../../api/subscriptionApi';
import './sidebar.css';

const LOGO_LEAF_PATH = 'M16,16 C11,15 9,9 16,3 C23,9 21,15 16,16 Z';

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="rotate(0 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-evergreen)' }} />
    </g>
    <g transform="rotate(120 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary)' }} />
    </g>
    <g transform="rotate(240 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-sage)' }} />
    </g>
  </svg>
);

const NAV_ITEMS = [
  { to: '/', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/interview', icon: 'ti-microphone', label: 'Interview' },
  { to: '/interview/history', icon: 'ti-history', label: 'History' },
  { to: '/account', icon: 'ti-user-circle', label: 'Account' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { getToken, isSignedIn } = useAuth();
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSub() {
      if (!isSignedIn) {
        setSubscription(null);
        return;
      }
      try {
        const sub = await fetchMySubscription(getToken);
        if (isMounted) setSubscription(sub);
      } catch (err) {
        // Silently fallback if offline or request fails
      }
    }
    loadSub();
    return () => {
      isMounted = false;
    };
  }, [isSignedIn, getToken]);

  const hasActivePlan = Boolean(subscription?.has_active_subscription);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <Logo />
          {!collapsed && (
            <span className="sidebar__logo-text">
              Interview<span className="sidebar__logo-iq"> IQ</span>
            </span>
          )}
        </div>
        <button
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`ti ${collapsed ? 'ti-menu-2' : 'ti-layout-sidebar'}`} aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
            }
          >
            <span className="sidebar__icon-wrap">
              <i className={`ti ${icon} sidebar__icon`} aria-hidden="true" />
            </span>
            {!collapsed && <span className="sidebar__label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Subscription card */}
      {!collapsed && (
        <NavLink
          to={hasActivePlan ? '/account' : '/pricing'}
          className="sidebar__plan"
        >
          <div className="sidebar__plan-header">
            <span className="sidebar__plan-title">
              {hasActivePlan ? subscription.plan_name : 'No active plan'}
            </span>
            {hasActivePlan && (
              <span className="sidebar__plan-badge">Active</span>
            )}
          </div>
          <span className="sidebar__plan-text">
            {hasActivePlan ? (
              <>
                {subscription.sessions_remaining_today ?? 0}/{subscription.daily_session_limit ?? 0} sessions today
                {subscription.plan_type === 'usage_based' && subscription.remaining_usage_days != null
                  ? ` • ${subscription.remaining_usage_days}d left`
                  : ''}
              </>
            ) : (
              'Choose a plan to start sessions.'
            )}
          </span>
        </NavLink>
      )}
    </aside>
  );
}
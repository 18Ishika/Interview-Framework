import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const LOGO_LEAF_PATH = 'M16,16 C11,15 9,9 16,3 C23,9 21,15 16,16 Z';

const Logo = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(0 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary-dark)' }} />
    </g>
    <g transform="rotate(120 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary-mid)' }} />
    </g>
    <g transform="rotate(240 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary)' }} />
    </g>
  </svg>
);

const NAV_ITEMS = [
  { to: '/',             icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/coding-round', icon: 'ti-code',             label: 'Coding Round' },
  { to: '/interview',    icon: 'ti-microphone',       label: 'Interview' },
  { to: '/account',      icon: 'ti-user-circle',      label: 'Account' },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <Logo />
        {!collapsed && (
          <span className="sidebar__logo-text">
            Interview<span className="sidebar__logo-iq"> IQ</span>
          </span>
        )}
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
            <i className={`ti ${icon} sidebar__icon`} aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
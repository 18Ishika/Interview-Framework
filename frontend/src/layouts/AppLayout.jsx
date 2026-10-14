import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/sidebar';
import './AppLayout.css';

export default function AppLayout() {
  const { isSignedIn } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      {isSignedIn && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      )}
      <div
        className="app-layout__content"
        style={{ marginLeft: isSignedIn ? (collapsed ? 60 : 220) : 0 }}
      >
        <Navbar />
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
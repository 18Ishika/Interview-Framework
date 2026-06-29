import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import './AppLayout.css';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className="app-layout__content"
        style={{ marginLeft: collapsed ? 60 : 220 }}
      >
        <Navbar />
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
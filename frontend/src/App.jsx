import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate ,useLocation } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import './App.css';
import { useBackendSync } from './hooks/useBackendSync';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import DashboardPreview from './components/DashboardPreview';
import Profile from './pages/Profile';
import InterviewPreflight from './components/InterviewPreflight';
import InterviewSetup from './pages/InterviewSetup';
import InterviewSession from './pages/InterviewSession';
import Login from './pages/login';
import Signup from './pages/signup';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env');
}

function HomePage() {
  useBackendSync();
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div className="app">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <DashboardPreview />
    </div>
  );
}

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function PreflightPage() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <ProtectedRoute>
      <InterviewPreflight onBeginRealInterview={() => navigate('/interview/session', { state: location.state })} />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login/*" element={<Login />} />
          <Route path="/signup/*" element={<Signup />} />

          {/* Interview flow — outside AppLayout (no sidebar) */}
          <Route path="/interview/preflight" element={<PreflightPage />} />
          <Route path="/interview/session" element={
            <ProtectedRoute><InterviewSession /></ProtectedRoute>
          } />

          {/* App shell with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/coding-round" element={<ProtectedRoute><div>Coding Round</div></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;
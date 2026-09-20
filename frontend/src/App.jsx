import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import './App.css';
import { useBackendSync } from './hooks/useBackendSync';
import AppLayout from './layouts/AppLayout';
import Navbar from './components/common/Navbar';
import InterviewHistory from './pages/interview/InterviewHistory';
import Hero from './components/landing/Hero';
import Features from './components/landing/Features';
import HowItWorks from './components/landing/HowItWorks';
import DashboardPreview from './components/landing/DashboardPreview';
import Profile from './pages/profile/Profile';
import PublicCandidateProfile from './pages/profile/publiccandidateprofile';
import InterviewPreflight from './components/interview/Interviewpreflight';
import InterviewSetup from './pages/interview/InterviewSetup';
import InterviewSession from './pages/interview/InterviewSession';
import HrInterviewSession from './pages/interview/HrInterviewSession';
import InterviewResults from './pages/interview/InterviewResults';
import Login from './pages/auth/login';
import Signup from './pages/auth/signup';
import Dashboard from './pages/dashboard';
import IQCardPage from './pages/profile/IQCardPage';

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
      <InterviewPreflight onBeginRealInterview={() => {
        if (location.state?.type === 'hr') {
          navigate('/interview/hr', { state: location.state });
        } else {
          navigate('/interview/session', { state: location.state });
        }
      }} />
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
          <Route path="/candidate/:candidateId" element={<PublicCandidateProfile />} />

          {/* Interview flow — outside AppLayout (no sidebar) */}
          <Route path="/interview/preflight" element={<PreflightPage />} />
          <Route path="/interview/session" element={
            <ProtectedRoute><InterviewSession /></ProtectedRoute>
          } />
          <Route path="/interview/hr" element={
            <ProtectedRoute><HrInterviewSession /></ProtectedRoute>
          } />
          <Route path="/interview/results" element={
            <ProtectedRoute><InterviewResults /></ProtectedRoute>
          } />

          {/* Public IQ Card */}
          {/* App shell with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/profile/iq-card/:platformId" element={<IQCardPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/interview/history" element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />
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
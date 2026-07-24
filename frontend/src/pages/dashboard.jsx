import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Pusher from 'pusher-js';
import { getPendingNotifications, acknowledgeResult } from '../api/interviewApi';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import DashboardPreview from '../components/DashboardPreview';

export default function Dashboard() {
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [showResultsPopup, setShowResultsPopup] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentRoundType, setCurrentRoundType] = useState('technical');

  useEffect(() => {
    if (!userId) return;

    // 1. Fetch pending notifications on mount
    const checkPending = async () => {
      try {
        const res = await getPendingNotifications(getToken);
        if (res.pending && res.pending.length > 0) {
          // Show the first pending one
          setCurrentSessionId(res.pending[0].session_id);
          setCurrentRoundType(res.pending[0].round_type);
          setShowResultsPopup(true);
        }
      } catch (err) {
        console.error("Error fetching pending notifications", err);
      }
    };
    checkPending();

    // 2. Subscribe to Pusher
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;
    console.log(pusherKey);
    console.log(pusherCluster);

    if (!pusherKey) {
      console.warn("Pusher Key is not defined in env. Real-time updates will not work.");
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster || 'mt1'
    });

    const channel = pusher.subscribe(`user-${userId}`);
    channel.bind('evaluation_completed', function (data) {
      if (data.data && data.data.session_id) {
        setCurrentSessionId(data.data.session_id);
        setCurrentRoundType(data.round_type || 'technical');
        setShowResultsPopup(true);
      }
    });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId, getToken]);

  const handleDismissPopup = async (navigateToResults = false) => {
    if (currentSessionId) {
      try {
        await acknowledgeResult(currentSessionId, currentRoundType, getToken);
      } catch (err) {
        console.error("Failed to acknowledge result", err);
      }
    }
    setShowResultsPopup(false);
    if (navigateToResults) {
      navigate('/interview/results', { state: { sessionId: currentSessionId, roundType: currentRoundType } });
    }
  };

  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <DashboardPreview />

      {showResultsPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            textAlign: 'center', maxWidth: '400px', width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#111827' }}>🎉 Evaluation Complete!</h2>
            <p style={{ color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>
                Your {currentRoundType === 'hr' ? 'HR' : 'technical'} interview has been successfully evaluated by our AI.
              </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => handleDismissPopup(false)}
                style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151', fontWeight: '500' }}
              >
                Dismiss
              </button>
              <button
                onClick={() => handleDismissPopup(true)}
                style={{ padding: '10px 20px', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500' }}
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
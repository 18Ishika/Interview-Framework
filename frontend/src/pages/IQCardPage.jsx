import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../lib/config';
import IQCard from '../components/IQCard/IQCard';
import logoUrl from '../assets/logo.svg';

export default function IQCardPage() {
  const { platformId } = useParams();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/public/profile/${platformId}/`);
        if (!res.ok) {
          throw new Error('Profile not found');
        }
        const data = await res.json();

        let profile = data.user || data;
        profile.scores = data.scores;

        setProfileData({
          user: profile,
          skills: data.skills,
          projects: data.projects,
          scores: data.scores
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (platformId) {
      fetchProfile();
    }
  }, [platformId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8f9fa', color: '#2d3748' }}>
        Loading your IQ Card...
      </div>
    );
  }

  const handleCopyLink = () => {
    if (platformId) {
      const url = `${window.location.origin}/profile/iq-card/${platformId}`;
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
      });
    } else {
      alert("Platform ID not found.");
    }
  };

  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'opacity 0.2s, transform 0.2s',
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      color: '#2d3748',
    }}>
      {/* Left side: Card */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <IQCard profileData={profileData} />
      </div>

      {/* Right side: Actions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#2b4c65', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <img src={logoUrl} alt="Interview IQ Logo" style={{ width: '48px', height: '48px' }} />
            Interview IQ
          </h1>
          <p style={{ fontSize: '20px', color: '#4a5568', margin: 0, fontWeight: '500' }}>
            Share your #IQCard
          </p>
          <p style={{ fontSize: '16px', color: '#718096', marginTop: '5px' }}>
            with friends and recruiters
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '350px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
          <button style={{ ...btnStyle, backgroundColor: '#31678c', color: '#fff', flex: 1, marginBottom: 0 }} onMouseEnter={e => e.target.style.opacity = '0.9'} onMouseLeave={e => e.target.style.opacity = '1'}>
            Download ⬇
          </button>

          <button
            onClick={handleCopyLink}
            title="Copy Card Link"
            style={{ ...btnStyle, width: '48px', flex: 'none', backgroundColor: '#fff', color: '#4a5568', border: '1px solid #cbd5e0', marginBottom: 0 }}
            onMouseEnter={e => e.target.style.opacity = '0.7'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            🔗
          </button>

          <button
            onClick={() => navigate('/account')}
            title="Go to Account"
            style={{ ...btnStyle, width: '48px', flex: 'none', backgroundColor: '#fff', color: '#4a5568', border: '1px solid #cbd5e0', marginBottom: 0 }}
            onMouseEnter={e => e.target.style.opacity = '0.7'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            👤
          </button>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', width: '100%', maxWidth: '350px' }}>
          <button style={{ ...btnStyle, backgroundColor: '#0077b5', color: '#fff', marginBottom: 0 }} onMouseEnter={e => e.target.style.opacity = '0.9'} onMouseLeave={e => e.target.style.opacity = '1'}>
            in Share on LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}

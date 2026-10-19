import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../../lib/config';
import IQCard from '../../components/profile/IQCard/IQCard';
import logoUrl from '../../assets/logo.svg';

const LOGO_LEAF = 'M16,16 C11,15 9,9 16,3 C23,9 21,15 16,16 Z';

const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d={LOGO_LEAF} fill="var(--color-evergreen, #00200B)" />
    <path d={LOGO_LEAF} fill="var(--color-primary, #D4A373)" transform="rotate(120 16 16)" />
    <path d={LOGO_LEAF} fill="var(--color-sage, #9CBA9D)" transform="rotate(240 16 16)" />
  </svg>
);

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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
      }}>
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
    padding: '13px 20px',
    borderRadius: 'var(--radius-full, 999px)',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'background 0.25s var(--ease-out), transform 0.25s var(--ease-out), border-color 0.25s var(--ease-out)',
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-body)',
      flexWrap: 'wrap',
    }}>
      {/* Left side: Card */}
      <div style={{ flex: 1, minWidth: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <IQCard profileData={profileData} />
      </div>

      {/* Right side: Actions */}
      <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.025em',
            margin: '0 0 10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}>
            <Logo size={42} />
            Interview<span style={{ color: 'var(--color-primary-mid)' }}> IQ</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', margin: 0, fontWeight: '500' }}>
            Share your #IQCard
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            with friends and recruiters
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '350px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
          <button
            style={{
              ...btnStyle,
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-evergreen)',
              flex: 1,
              marginBottom: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#C48F5C';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Download ⬇
          </button>

          <button
            onClick={handleCopyLink}
            title="Copy Card Link"
            style={{
              ...btnStyle,
              width: '46px',
              height: '46px',
              padding: 0,
              flex: 'none',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-strong)',
              marginBottom: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.borderColor = 'var(--color-border-strong)';
            }}
          >
            🔗
          </button>

          <button
            onClick={() => navigate('/account')}
            title="Go to Account"
            style={{
              ...btnStyle,
              width: '46px',
              height: '46px',
              padding: 0,
              flex: 'none',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-strong)',
              marginBottom: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.borderColor = 'var(--color-border-strong)';
            }}
          >
            👤
          </button>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', width: '100%', maxWidth: '350px' }}>
          <button
            style={{
              ...btnStyle,
              backgroundColor: 'var(--color-primary)',
              color: '#000000',
              marginBottom: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Share on LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}

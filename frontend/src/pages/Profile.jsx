import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

import { API_BASE, SERVER_BASE } from '../lib/config';

export default function Profile() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [resume, setResume] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch current profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken({ skipCache: true });
        const res = await fetch(`${API_BASE}/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = await getToken({ skipCache: true });
      const formData = new FormData();
      if (resume) formData.append('resume', resume);
      if (photo) formData.append('photo', photo);

      const res = await fetch(`${API_BASE}/profile/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setProfile(data);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage('Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-body)',
    }}>
      Loading...
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      fontFamily: 'var(--font-body)',
      padding: '60px 24px',
    }}>
      <div style={{
        maxWidth: 560,
        margin: '0 auto',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 16,
              fontFamily: 'var(--font-body)',
            }}
          >
            ← Back
          </button>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}>Your Profile</h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 14,
            marginTop: 6,
          }}>Upload your resume and photo</p>
        </div>

        {/* Photo Upload */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
          }}>
            Profile Photo
          </label>
          {profile?.photo && (
            <div style={{ marginBottom: 8 }}>
              <img
                src={`${SERVER_BASE}${profile.photo}`}
                alt="Profile"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--color-border)',
                }}
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={e => setPhoto(e.target.files[0])}
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {/* Resume Upload */}
        <div style={{ marginBottom: 32 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
          }}>
            Resume (PDF)
          </label>
          {profile?.resume && (
            <p style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              marginBottom: 8,
            }}>
              ✅ Resume uploaded
            </p>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={e => setResume(e.target.files[0])}
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || (!resume && !photo)}
          style={{
            width: '100%',
            padding: '12px',
            background: saving || (!resume && !photo) 
              ? 'var(--color-bg-tertiary)' 
              : 'var(--color-primary)',
            color: saving || (!resume && !photo)
              ? 'var(--color-text-muted)'
              : '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 15,
            fontWeight: 600,
            cursor: saving || (!resume && !photo) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        {/* Message */}
        {message && (
          <p style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 13,
            color: message.includes('success') 
              ? 'var(--color-primary)' 
              : '#e53e3e',
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
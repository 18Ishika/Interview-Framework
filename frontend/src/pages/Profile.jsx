import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { API_BASE, SERVER_BASE } from '../lib/config';

export default function Profile() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [profile, setProfile] = useState(null);
  const [resume, setResume] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [education, setEducation] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [showSkillInput, setShowSkillInput] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken({ skipCache: true });
        const res = await fetch(`${API_BASE}/user/profile-details/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.user) {
          setProfile({ ...data.user, job_recommendations: data.job_recommendations });
        } else {
          setProfile(data);
        }

        if (data.skills) setSkills(data.skills);
        if (data.projects) setProjects(data.projects.map(p => ({ ...p, editing: false })));
        if (data.education) setEducation(data.education.map(e => ({ text: e, editing: false })));
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const parseResume = async (file, token) => {
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch(`${API_BASE}/resume/parse/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.skills) setSkills(data.skills);
      if (data.projects) setProjects(data.projects.map(p => ({ ...p, editing: false })));
      if (data.education) setEducation(data.education.map(e => ({ text: e, editing: false })));
      if (data.job_recommendations) setProfile(prev => ({ ...prev, job_recommendations: data.job_recommendations }));
    } catch (err) {
      console.error('Resume parsing failed:', err);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = await getToken({ skipCache: true });
      const formData = new FormData();
      if (resume) formData.append('resume', resume);
      if (photo) formData.append('profile_img', photo);

      const res = await fetch(`${API_BASE}/user/profile/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setProfile(data);
      setMessage('Profile updated successfully!');
      if (resume) await parseResume(resume, token);
    } catch (err) {
      setMessage('Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = (index) => {
    setSkills(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed]);
    }
    setNewSkill('');
    setShowSkillInput(false);
  };

  const handleProjectChange = (index, value) => {
    setProjects(prev => prev.map((p, i) => i === index ? { ...p, title: value } : p));
  };

  const handleProjectEditToggle = (index) => {
    setProjects(prev => prev.map((p, i) => i === index ? { ...p, editing: !p.editing } : p));
  };

  const handleDeleteProject = (index) => {
    setProjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProject = () => {
    setProjects(prev => [...prev, { title: '', description: [], editing: true }]);
  };

  const handleEducationChange = (index, value) => {
    setEducation(prev => prev.map((e, i) => i === index ? { ...e, text: value } : e));
  };

  const handleEducationEditToggle = (index) => {
    setEducation(prev => prev.map((e, i) => i === index ? { ...e, editing: !e.editing } : e));
  };

  const handleDeleteEducation = (index) => {
    setEducation(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddEducation = () => {
    setEducation(prev => [...prev, { text: '', editing: true }]);
  };

  // ── ID card derived data ────────────────────────────────────────────────

  const displayName =
    (profile?.first_name || profile?.last_name)
      ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
      : (user?.fullName || 'Your Name');

  const idNumber = 'IQ-' + (user?.id || profile?.id || '000000')
    .toString()
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase();

  const issuedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const roleLabel = profile?.target_role || 'Candidate';

  // Readiness is derived client-side from profile completeness until a
  // dedicated backend field (e.g. profile.readiness_score) exists.
  const readyScore = Math.round(
    ([
      !!profile?.resume_url,
      skills.length > 0,
      projects.length > 0,
      education.length > 0,
    ].filter(Boolean).length / 4) * 100
  );
  const isReady = readyScore >= 75;
  const statusLabel = isReady ? 'Interview Ready' : readyScore === 0 ? 'Not Started' : 'In Progress';

  const topRecommendations = (profile?.job_recommendations || []).slice(0, 2);

  const publicProfileUrl = `${window.location.origin}/candidate/${idNumber}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=4&color=1F4F78&bgcolor=FFFFFF&data=${encodeURIComponent(publicProfileUrl)}`;

  // ── Shared styles ───────────────────────────────────────────────────────

  const TINT = 'var(--color-bg-tertiary)';
  const TINT_BORDER = 'var(--color-border)';

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const iconBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  };

  const sectionHeadingStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const addBtnStyle = {
    background: TINT,
    border: `1px solid ${TINT_BORDER}`,
    borderRadius: 'var(--radius-md)',
    padding: '4px 10px',
    fontSize: 18,
    cursor: 'pointer',
    color: 'var(--color-primary-dark)',
    lineHeight: 1,
    transition: 'background 0.15s, border-color 0.15s',
  };

  const saveDisabled = saving || (!resume && !photo);

  const cardStyle = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    boxShadow: 'var(--shadow-md)',
  };

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    background: TINT,
    border: `1px solid ${TINT_BORDER}`,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-primary-hover)',
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
      <style>{`
        .idcard-status-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-success);
          margin-right: 6px;
        }
        .idcard-progress-track {
          width: 100%;
          height: 5px;
          border-radius: var(--radius-full);
          background: var(--color-bg-tertiary);
          overflow: hidden;
        }
        .idcard-progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          background: var(--color-primary-dark);
          transition: width 0.4s ease;
        }
        .top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .left-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (max-width: 800px) {
          .top-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
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
          }}>Your credential — and the details behind it</p>
        </div>

        {/* Left: uploads · Right: minimal ID card */}
        <div className="top-grid" style={{ marginBottom: 24 }}>

          {/* LEFT COLUMN */}
          <div className="left-col">
            {/* Resume + Save */}
            <div style={cardStyle}>
              <h2 style={{ ...sectionHeadingStyle, marginBottom: 16 }}>Resume</h2>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: 8,
                }}>
                  Resume (PDF / DOCX)
                </label>
                {profile?.resume_url && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    ✅ Resume uploaded
                  </p>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setResume(e.target.files[0])}
                  style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saveDisabled}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: saveDisabled ? 'var(--color-bg-tertiary)' : 'var(--color-primary-dark)',
                  color: saveDisabled ? 'var(--color-text-muted)' : '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saveDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!saveDisabled) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
                onMouseLeave={e => { if (!saveDisabled) e.currentTarget.style.background = 'var(--color-primary-dark)'; }}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>

              {message && (
                <p style={{
                  marginTop: 16,
                  textAlign: 'center',
                  fontSize: 13,
                  color: message.includes('success') ? 'var(--color-success)' : 'var(--color-danger)',
                }}>
                  {message}
                </p>
              )}

              {parsing && (
                <p style={{
                  marginTop: 12,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}>
                  Extracting skills and projects from your resume...
                </p>
              )}
            </div>

            {/* Profile Photo */}
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: 16,
              }}>
                Profile Photo
              </label>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                {profile?.profile_img_url ? (
                  <img
                    src={`${profile.profile_img_url}`}
                    alt="Profile"
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--color-border)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    background: TINT,
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    color: 'var(--color-text-muted)',
                  }}>👤</div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={e => setPhoto(e.target.files[0])}
                style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', maxWidth: '100%' }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN — minimal ID card */}
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            padding: '20px',
          }}>
            {/* Top row: photo + identity + status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {profile?.profile_img_url ? (
                  <img src={profile.profile_img_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>👤</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.2,
                }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {roleLabel}
                </div>
              </div>

              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '4px 8px',
                borderRadius: 'var(--radius-full)',
                background: isReady ? 'rgba(63,168,115,0.12)' : 'rgba(217,164,65,0.14)',
                color: isReady ? 'var(--color-success)' : 'var(--color-warning)',
                flexShrink: 0,
              }}>
                {statusLabel}
              </span>
            </div>

            <div style={{ height: 0, borderTop: '1px solid var(--color-border)', margin: '14px 0' }} />

            {/* ID + member since */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 14 }}>
              <span>ID · <span style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{idNumber}</span></span>
              <span>Since {issuedDate}</span>
            </div>

            {/* Job Recommendations (top 2) */}
            {topRecommendations.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Top Matches
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {topRecommendations.map((rec, i) => (
                    <span key={i} style={chipStyle}>{rec.job}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Ready score */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Ready Score
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>{readyScore}%</span>
              </div>
              <div className="idcard-progress-track">
                <div className="idcard-progress-fill" style={{ width: `${readyScore}%` }} />
              </div>
            </div>

            {/* Footer: status dot + QR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <span className="idcard-status-dot" />
                {statusLabel}
              </div>
              <img
                src={qrCodeUrl}
                alt="Scan to view public candidate profile"
                width={44}
                height={44}
                style={{ borderRadius: 6, border: '1px solid var(--color-border)' }}
              />
            </div>
          </div>
        </div>

        {/* Skills Section */}
        {skills.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={sectionHeadingStyle}>Skills</h2>
              <button
                onClick={() => setShowSkillInput(true)}
                style={addBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = TINT; }}
              >+</button>
            </div>

            {showSkillInput && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  autoFocus
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                  placeholder="Type a skill and press Enter"
                  style={inputStyle}
                />
                <button onClick={handleAddSkill} style={{
                  padding: '6px 14px',
                  background: 'var(--color-primary-dark)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary-dark)')}
                >Add</button>
                <button onClick={() => { setShowSkillInput(false); setNewSkill(''); }} style={{
                  padding: '6px 10px',
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skills.map((skill, i) => (
                <span key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  background: TINT,
                  border: `1px solid ${TINT_BORDER}`,
                  borderRadius: 20,
                  fontSize: 12,
                  color: 'var(--color-primary-hover)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {skill}
                  <button
                    onClick={() => handleDeleteSkill(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      lineHeight: 1,
                      marginLeft: 2,
                    }}
                  >✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects Section */}
        {projects.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={sectionHeadingStyle}>Projects</h2>
              <button
                onClick={handleAddProject}
                style={addBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = TINT; }}
              >+</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map((project, i) => (
                <div key={i} style={{
                  padding: '10px 14px',
                  background: TINT,
                  border: `1px solid ${TINT_BORDER}`,
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {project.editing ? (
                      <input
                        autoFocus
                        value={project.title}
                        onChange={e => handleProjectChange(i, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleProjectEditToggle(i)}
                        style={{ ...inputStyle, marginBottom: 0 }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {project.title}
                      </span>
                    )}
                    <button onClick={() => handleProjectEditToggle(i)} style={iconBtnStyle}>
                      {project.editing ? '✓' : '✏️'}
                    </button>
                    <button onClick={() => handleDeleteProject(i)} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }}>
                      ✕
                    </button>
                  </div>

                  {project.description?.length > 0 && (
                    <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {project.description.map((point, j) => (
                        <li key={j} style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education Section */}
        {education.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={sectionHeadingStyle}>Education</h2>
              <button
                onClick={handleAddEducation}
                style={addBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = TINT; }}
              >+</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {education.map((edu, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: TINT,
                  border: `1px solid ${TINT_BORDER}`,
                  borderRadius: 'var(--radius-md)',
                }}>
                  {edu.editing ? (
                    <input
                      autoFocus
                      value={edu.text}
                      onChange={e => handleEducationChange(i, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEducationEditToggle(i)}
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>
                      {edu.text}
                    </span>
                  )}
                  <button onClick={() => handleEducationEditToggle(i)} style={iconBtnStyle}>
                    {edu.editing ? '✓' : '✏️'}
                  </button>
                  <button onClick={() => handleDeleteEducation(i)} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Job Recommendations (full list) */}
        {profile?.job_recommendations?.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h2 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>Job Recommendations</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.job_recommendations.map((rec, i) => (
                <span key={i} style={{
                  padding: '4px 12px',
                  background: TINT,
                  border: `1px solid ${TINT_BORDER}`,
                  borderRadius: 20,
                  fontSize: 12,
                  color: 'var(--color-primary-hover)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                }}>
                  {rec.job}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { API_BASE, SERVER_BASE } from '../../lib/config';
import IQCard from '../../components/profile/IQCard/IQCard';
import ProfileIdCard from '../../components/profile/ProfileIdCard/ProfileIdCard';

export default function Profile() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const [profile, setProfile] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_profile_details');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.user ? { ...parsed.user, job_recommendations: parsed.job_recommendations, scores: parsed.scores } : parsed;
      }
    } catch (e) {}
    return null;
  });
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('cached_profile_details'));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [skills, setSkills] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_profile_details');
      if (cached) return JSON.parse(cached).skills || [];
    } catch (e) {}
    return [];
  });
  const [projects, setProjects] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_profile_details');
      if (cached) {
        const p = JSON.parse(cached).projects;
        if (p) return p.map(item => ({ ...item, editing: false }));
      }
    } catch (e) {}
    return [];
  });
  const [education, setEducation] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_profile_details');
      if (cached) {
        const ed = JSON.parse(cached).education;
        if (ed) return ed.map(item => ({ text: item, editing: false }));
      }
    } catch (e) {}
    return [];
  });
  const [parsing, setParsing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [showSkillInput, setShowSkillInput] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/user/profile-details/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        sessionStorage.setItem('cached_profile_details', JSON.stringify(data));

        if (data.user) {
          setProfile({ ...data.user, job_recommendations: data.job_recommendations, scores: data.scores });
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

  const handleAvatarClick = () => {
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setMessage('');
    try {
      sessionStorage.removeItem('cached_profile_details');
      const token = await getToken();
      const formData = new FormData();
      formData.append('profile_img', file);

      const res = await fetch(`${API_BASE}/user/profile/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      const updatedData = data.data || data.user || data;
      setProfile(prev => ({ ...prev, ...updatedData }));
      setMessage('Profile photo updated successfully!');
    } catch (err) {
      setMessage('Failed to update profile photo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      sessionStorage.removeItem('cached_profile_details');
      const token = await getToken();
      const formData = new FormData();
      if (resume) formData.append('resume', resume);

      const res = await fetch(`${API_BASE}/user/profile/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      const updatedData = data.data || data.user || data;
      setProfile(prev => ({ ...prev, ...updatedData }));
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

  const idNumber = profile?.platform_id || profile?.data?.platform_id || ('IQ-' + (user?.id || profile?.id || '000000')
    .toString()
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase());

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

  const idStatus = isReady ? 'ready' : readyScore === 0 ? 'none' : 'progress';

  // Same four inputs that drive readyScore, listed so the user can see what is missing.
  const completeness = [
    { label: 'Resume uploaded', done: !!profile?.resume_url },
    { label: 'Skills added', done: skills.length > 0 },
    { label: 'Project added', done: projects.length > 0 },
    { label: 'Education added', done: education.length > 0 },
  ];


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

  const saveDisabled = saving || !resume;

  const cardStyle = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    boxShadow: 'var(--shadow-md)',
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
        .top-grid {
          display: grid;
          grid-template-columns: minmax(0, 480px) minmax(0, 1fr);
          gap: 32px;
          align-items: start;
          margin-bottom: 28px;
        }
        .profile-side {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .check-list {
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .check-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .check-item--done { color: var(--color-text-primary); }
        .check-mark {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1.5px solid var(--color-border-strong);
          font-size: 11px;
          line-height: 1;
          color: transparent;
        }
        .check-item--done .check-mark {
          background: var(--color-success);
          border-color: var(--color-success);
          color: #fff;
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
        @media (max-width: 900px) {
          .top-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
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

        {/* ID card + resume / completeness */}
        <div className="top-grid">
          <div>
            {/* Hidden file input for photo upload */}
            <input
              type="file"
              ref={photoInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />

            <ProfileIdCard
              name={displayName}
              role={roleLabel}
              idNumber={idNumber}
              issued={issuedDate}
              status={idStatus}
              statusLabel={statusLabel}
              readyScore={readyScore}
              photoUrl={profile?.profile_img_url}
              onPhotoClick={handleAvatarClick}
              skills={skills}
              recommendations={topRecommendations.map(r => r.job)}
              education={education.map(e => e.text).filter(Boolean)}
            >
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (profile?.platform_id) {
                    navigate(`/profile/iq-card/${profile.platform_id}`);
                  } else {
                    alert("Platform ID not found. Please wait a moment or reload the page.");
                  }
                }}
              >
                Get your IQ Card
              </button>
            </ProfileIdCard>
          </div>

          <div className="profile-side">

            {/* Resume upload */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <h2 style={sectionHeadingStyle}>Resume</h2>
                {profile?.resume_url && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)' }}>
                    Uploaded
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, marginBottom: 16 }}>
                PDF or DOCX. We pull your skills, projects and education from it.
              </p>

              <input
                type="file"
                ref={resumeInputRef}
                accept=".pdf,.doc,.docx"
                onChange={e => setResume(e.target.files[0])}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <button
                    type="button"
                    onClick={() => resumeInputRef.current?.click()}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-primary)'}
                  >
                    Choose file
                  </button>
                  <span style={{
                    fontSize: 13,
                    color: resume ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                    fontFamily: 'var(--font-body)',
                  }}>
                    {resume ? resume.name : 'No file chosen'}
                  </span>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saveDisabled}
                  style={{
                    padding: '8px 16px',
                    background: saveDisabled ? 'var(--color-bg-tertiary)' : 'var(--color-primary-dark)',
                    color: saveDisabled ? 'var(--color-text-muted)' : '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
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
              </div>

              {message && (
                <p style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: message.includes('success') ? 'var(--color-success)' : 'var(--color-danger)',
                }}>
                  {message}
                </p>
              )}

              {parsing && (
                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Extracting skills and projects from your resume...
                </p>
              )}
            </div>

            {/* Ready score breakdown */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 style={sectionHeadingStyle}>Ready score</h2>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{readyScore}%</span>
              </div>
              <div className="idcard-progress-track">
                <div className="idcard-progress-fill" style={{ width: `${readyScore}%` }} />
              </div>
              <ul className="check-list">
                {completeness.map(item => (
                  <li key={item.label} className={`check-item${item.done ? ' check-item--done' : ''}`}>
                    <span className="check-mark" aria-hidden="true">✓</span>
                    {item.label}
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                      {item.done ? ' (done)' : ' (to do)'}
                    </span>
                  </li>
                ))}
              </ul>
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
import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * Dummy public-facing candidate profile.
 * This is what someone lands on after scanning the QR code on the
 * Profile page's ID card. It currently renders placeholder data keyed
 * off the candidate ID in the URL — swap `DUMMY_CANDIDATE` for a real
 * fetch (e.g. `${API_BASE}/public/candidate/${candidateId}/`) once a
 * public-facing endpoint exists on the backend.
 */

const DUMMY_CANDIDATE = {
  name: 'Deepti Sharma',
  role: 'Backend Developer Candidate',
  memberSince: 'Jan 2026',
  readyScore: 87,
  status: 'Interview Ready',
  track: ['Python', 'Django', 'REST APIs', 'Docker'],
  skills: ['Python', 'Django REST Framework', 'MySQL', 'Redis', 'Celery', 'Docker', 'React'],
  projects: [
    { title: 'InterviewIQ', description: 'AI-powered mock interview platform with Whisper transcription and NLP-based scoring.' },
    { title: 'AngaarxW3Grads Portal', description: 'Full-stack educational platform with a DRF-backed admin panel.' },
  ],
  education: ['B.Tech, Computer Science & Engineering'],
};

export default function PublicCandidateProfile() {
  const { candidateId } = useParams();
  const candidate = DUMMY_CANDIDATE; // placeholder — real data would be looked up by candidateId

  const isReady = candidate.readyScore >= 75;

  const cardStyle = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-md)',
  };

  const sectionHeadingStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: '0 0 12px',
  };

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 20,
    fontSize: 12,
    color: 'var(--color-primary-hover)',
    fontWeight: 500,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      fontFamily: 'var(--font-body)',
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 700,
          }}>
            Interview IQ · Public Progress Profile
          </div>
          {candidateId && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Candidate ID: {candidateId}
            </div>
          )}
        </div>

        {/* Header card */}
        <div style={{
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 55%, var(--color-primary) 100%)',
          boxShadow: '0 16px 40px rgba(31, 79, 120, 0.28)',
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <div style={{
            background: isReady ? 'var(--color-success)' : 'var(--color-warning)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '7px 0',
          }}>
            {candidate.status}
          </div>

          <div style={{ padding: '28px 30px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{
                width: 76,
                height: 76,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.14)',
                border: '3px solid rgba(255,255,255,0.85)',
                boxShadow: '0 0 0 3px var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>👤</span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {candidate.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 4, fontWeight: 500 }}>
                  {candidate.role}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 6, letterSpacing: '0.04em' }}>
                  Member since {candidate.memberSince}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                  Ready Score
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{candidate.readyScore}%</span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${candidate.readyScore}%`, background: '#fff', borderRadius: 'var(--radius-full)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Interview Track */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h2 style={sectionHeadingStyle}>Interview Track</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {candidate.track.map((t, i) => <span key={i} style={chipStyle}>{t}</span>)}
          </div>
        </div>

        {/* Skills */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h2 style={sectionHeadingStyle}>Skills</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {candidate.skills.map((s, i) => <span key={i} style={chipStyle}>{s}</span>)}
          </div>
        </div>

        {/* Projects */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h2 style={sectionHeadingStyle}>Projects</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {candidate.projects.map((p, i) => (
              <div key={i} style={{
                padding: '10px 14px',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {p.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div style={cardStyle}>
          <h2 style={sectionHeadingStyle}>Education</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidate.education.map((e, i) => (
              <div key={i} style={{
                padding: '10px 14px',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                color: 'var(--color-text-primary)',
              }}>
                {e}
              </div>
            ))}
          </div>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          marginTop: 24,
        }}>
          This is a shared read-only progress profile from Interview IQ.
        </p>
      </div>
    </div>
  );
}
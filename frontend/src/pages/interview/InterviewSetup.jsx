import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InterviewSetup.css';

const ROLES = [
  "Backend Developer (Fresher)",
  "Frontend Developer (Fresher)",
  "Data Scientist (Fresher)",
  "Software Developer (Fresher)",
  "DevOps Engineer (Fresher)",
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('technical');
  const [selectedRole, setSelectedRole] = useState('');
  const [jd, setJd] = useState('');

  function handleStart() {
    if (selectedType === 'technical' && !selectedRole) return;
    navigate('/interview/preflight', { state: { type: selectedType, role: selectedRole, jd } });
  }

  return (
    <div className="is-page">
      <h1 className="is-title">Set up your interview</h1>
      <p className="is-sub">Configure the session before entering the interview room.</p>

      {/* Type selector */}
      <div className="is-section">
        <div className="is-label">Interview type</div>
        <div className="is-type-grid">
          <div
            className={`is-type-card ${selectedType === 'technical' ? 'is-type-card--selected' : ''}`}
            onClick={() => setSelectedType('technical')}
          >
            <div className="is-type-icon">
              <i className="ti ti-terminal-2" aria-hidden="true" />
            </div>
            <div>
              <div className="is-type-name">
                Technical
                {selectedType === 'technical' && <span className="is-sel-pill">Selected</span>}
              </div>
              <div className="is-type-desc">DSA, system design, coding questions with a live editor.</div>
            </div>
          </div>

          <div
            className={`is-type-card ${selectedType === 'hr' ? 'is-type-card--selected' : ''}`}
            onClick={() => setSelectedType('hr')}
          >
            <div className="is-type-icon">
              <i className="ti ti-users" aria-hidden="true" />
            </div>
            <div>
              <div className="is-type-name">
                HR / behavioural
                {selectedType === 'hr' && <span className="is-sel-pill">Selected</span>}
              </div>
              <div className="is-type-desc">Situational and culture-fit questions, no coding required.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role selector — only for technical */}
      {selectedType === 'technical' && (
        <div className="is-section">
          <div className="is-label">Select role</div>
          <div className="is-role-grid">
            {ROLES.map((role) => (
              <div
                key={role}
                className={`is-role-card ${selectedRole === role ? 'is-role-card--selected' : ''}`}
                onClick={() => setSelectedRole(role)}
              >
                {role}
                {selectedRole === role && <span className="is-sel-pill">Selected</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job description */}
      <div className="is-section">
        <div className="is-label">
          Job description <span className="is-optional">(optional)</span>
        </div>
        <textarea
          className="is-jd"
          placeholder="Paste the job description here — the AI will tailor questions to the role and stack."
          value={jd}
          onChange={e => setJd(e.target.value)}
        />
      </div>

      {/* Instructions */}
      <div className="is-section">
        <div className="is-label">Before you begin</div>
        <div className="is-instructions">
          <div className="is-instruction-item">
            <div className="is-instruction-icon"><i className="ti ti-maximize" /></div>
            <div>
              <div className="is-instruction-title">Full-screen mode required</div>
              <div className="is-instruction-desc">The interview runs in full screen. Exiting or switching tabs will flag a warning and may terminate the session.</div>
            </div>
          </div>
          <div className="is-instruction-item">
            <div className="is-instruction-icon"><i className="ti ti-video" /></div>
            <div>
              <div className="is-instruction-title">Camera and mic must be on</div>
              <div className="is-instruction-desc">You'll be prompted to allow access on the next screen.</div>
            </div>
          </div>
          
          <div className="is-instruction-item">
            <div className="is-instruction-icon"><i className="ti ti-forbid" /></div>
            <div>
              <div className="is-instruction-title">No tab switching</div>
              <div className="is-instruction-desc">Leaving the interview tab during the session will be flagged automatically.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="is-actions">
        <button className="is-btn-ghost" onClick={() => navigate(-1)}>Back</button>
        <button
          className="is-btn-primary"
          onClick={handleStart}
          disabled={selectedType === 'technical' && !selectedRole}
          style={{ opacity: selectedType === 'technical' && !selectedRole ? 0.5 : 1, cursor: selectedType === 'technical' && !selectedRole ? 'not-allowed' : 'pointer' }}
        >
          <i className="ti ti-player-play" />
          Continue to setup
        </button>
      </div>
    </div>
  );
}
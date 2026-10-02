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

const TYPES = [
  {
    id: 'technical',
    name: 'Technical',
    desc: 'DSA, system design, coding questions with a live editor.',
  },
  {
    id: 'hr',
    name: 'HR / behavioural',
    desc: 'Situational and culture-fit questions, no coding required.',
  },
];

const INSTRUCTIONS = [
  {
    title: 'Full-screen mode required',
    desc: 'The interview runs in full screen. Exiting or switching tabs will flag a warning and may terminate the session.',
  },
  {
    title: 'Camera and mic must be on',
    desc: "You'll be prompted to allow access on the next screen.",
  },
  {
    title: 'No tab switching',
    desc: 'Leaving the interview tab during the session will be flagged automatically.',
  },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('technical');
  const [selectedRole, setSelectedRole] = useState('');
  const [jd, setJd] = useState('');

  const needsRole = selectedType === 'technical';
  const canContinue = !needsRole || !!selectedRole;

  function handleStart() {
    if (!canContinue) return;
    navigate('/interview/preflight', { state: { type: selectedType, role: selectedRole, jd } });
  }

  return (
    <div className="is-page">
      <h1 className="is-title">Set up your interview</h1>
      <p className="is-sub">Configure the session before entering the interview room.</p>

      {/* Type selector */}
      <div className="is-section">
        <div className="is-label" id="is-type-label">Interview type</div>
        <div className="is-type-grid" role="radiogroup" aria-labelledby="is-type-label">
          {TYPES.map((t) => {
            const selected = selectedType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`is-type-card ${selected ? 'is-type-card--selected' : ''}`}
                onClick={() => setSelectedType(t.id)}
              >
                <span className="is-type-top">
                  <span className="is-type-name">{t.name}</span>
                  <span className="is-radio" aria-hidden="true" />
                </span>
                <span className="is-type-desc">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Role selector — only for technical */}
      {needsRole && (
        <div className="is-section">
          <div className="is-label" id="is-role-label">Select role</div>
          <div className="is-role-grid" role="radiogroup" aria-labelledby="is-role-label">
            {ROLES.map((role) => {
              const selected = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`is-role-card ${selected ? 'is-role-card--selected' : ''}`}
                  onClick={() => setSelectedRole(role)}
                >
                  {role}
                  <span className="is-radio" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Job description */}
      <div className="is-section">
        <label className="is-label" htmlFor="is-jd">
          Job description <span className="is-optional">(optional)</span>
        </label>
        <textarea
          id="is-jd"
          className="is-jd"
          placeholder="Paste the job description here — the AI will tailor questions to the role and stack."
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
        {jd.length > 0 && <div className="is-count">{jd.length} characters</div>}
      </div>

      {/* Instructions */}
      <div className="is-section">
        <div className="is-label">Before you begin</div>
        <div className="is-instructions">
          {INSTRUCTIONS.map((item) => (
            <div className="is-instruction-item" key={item.title}>
              <div className="is-instruction-title">{item.title}</div>
              <div className="is-instruction-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="is-actions">
        <button type="button" className="is-btn-ghost" onClick={() => navigate(-1)}>
          Back
        </button>
        <div className="is-actions-right">
          {!canContinue && <span className="is-hint">Select a role to continue</span>}
          <button
            type="button"
            className="is-btn-primary"
            onClick={handleStart}
            disabled={!canContinue}
          >
            Continue to setup
          </button>
        </div>
      </div>
    </div>
  );
}
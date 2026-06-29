import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InterviewSetup.css';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('technical');
  const [jd, setJd] = useState('');

  function handleStart() {
    navigate('/interview/preflight', { state: { type: selectedType, jd } });
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
            <div className="is-instruction-icon">
              <i className="ti ti-maximize" aria-hidden="true" />
            </div>
            <div>
              <div className="is-instruction-title">Full-screen mode required</div>
              <div className="is-instruction-desc">The interview runs in full screen. Exiting or switching tabs will flag a warning and may terminate the session.</div>
            </div>
          </div>
          <div className="is-instruction-item">
            <div className="is-instruction-icon">
              <i className="ti ti-video" aria-hidden="true" />
            </div>
            <div>
              <div className="is-instruction-title">Camera and mic must be on</div>
              <div className="is-instruction-desc">You'll be prompted to allow access on the next screen. Make sure your devices are connected and working.</div>
            </div>
          </div>
          <div className="is-instruction-item">
            <div className="is-instruction-icon">
              <i className="ti ti-clock" aria-hidden="true" />
            </div>
            <div>
              <div className="is-instruction-title">30-second demo first</div>
              <div className="is-instruction-desc">A quick demo session runs before the real interview so you can check your setup. Nothing is recorded during the demo.</div>
            </div>
          </div>
          <div className="is-instruction-item">
            <div className="is-instruction-icon">
              <i className="ti ti-forbid" aria-hidden="true" />
            </div>
            <div>
              <div className="is-instruction-title">No tab switching</div>
              <div className="is-instruction-desc">Leaving the interview tab during the session will be flagged automatically.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="is-actions">
        <button className="is-btn-ghost" onClick={() => navigate(-1)}>Back</button>
        <button className="is-btn-primary" onClick={handleStart}>
          <i className="ti ti-player-play" aria-hidden="true" />
          Continue to setup
        </button>
      </div>
    </div>
  );
}
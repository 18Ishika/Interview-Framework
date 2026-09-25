import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import './CodingRoundIntro.css';

export default function CodingRoundIntro({ onStartAssessment, loading, error }) {
  const [agreed, setAgreed] = useState(false);

  const handleStart = () => {
    if (!agreed) return;
    onStartAssessment();
  };

  return (
    <div className="coding-intro-container">
      <div className="coding-intro-card">
        <div className="coding-intro-header">
          <div className="coding-intro-icon">
            <i className="ti ti-code" />
          </div>
          <div>
            <h1 className="coding-intro-title">Technical Coding Assessment</h1>
            <p className="coding-intro-subtitle">
              Demonstrate your problem-solving, algorithmic efficiency, and coding skills in a real-time proctored environment.
            </p>
          </div>
        </div>

        {error && (
          <div className="coding-intro-error">
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}

        {/* Feature Grid */}
        <div className="coding-specs-grid">
          <div className="spec-card">
            <div className="spec-card__icon"><i className="ti ti-clock" /></div>
            <div className="spec-card__title">45 Minutes</div>
            <div className="spec-card__desc">Auto-submits when countdown expires</div>
          </div>
          <div className="spec-card">
            <div className="spec-card__icon"><i className="ti ti-list-check" /></div>
            <div className="spec-card__title">3 Problems</div>
            <div className="spec-card__desc">1 Easy, 1 Medium, and 1 Hard problem</div>
          </div>
          <div className="spec-card">
            <div className="spec-card__icon"><i className="ti ti-code" /></div>
            <div className="spec-card__title">Languages</div>
            <div className="spec-card__desc">Supported: Python, Java, C++</div>
          </div>
          <div className="spec-card">
            <div className="spec-card__icon"><i className="ti ti-shield-check" /></div>
            <div className="spec-card__title">Proctored IDE</div>
            <div className="spec-card__desc">Fullscreen enforcement & integrity monitoring</div>
          </div>
        </div>

        {/* Security & Rules Section */}
        <div className="rules-box">
          <div className="rules-box__header">
            <i className="ti ti-shield-lock" />
            <span>Assessment Integrity & Protocol</span>
          </div>
          <ul className="rules-list">
            <li>
              <strong>Fullscreen Mode Required:</strong> You must remain in fullscreen mode throughout the test. Exiting fullscreen logs a security flag.
            </li>
            <li>
              <strong>Copy & Paste Disabled:</strong> Clipboard paste actions are restricted inside the editor to ensure originality.
            </li>
            <li>
              <strong>Live Execution (Judge0):</strong> Use <em>"Run Code"</em> to test against visible sample test cases, and <em>"Submit Code"</em> to evaluate against all test cases.
            </li>
            <li>
              <strong>Session Auto-Sync:</strong> If you have an active interview session, this coding round will link seamlessly to it.
            </li>
          </ul>
        </div>

        {/* Agreement Checkbox */}
        <div className="agreement-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>I understand the rules and agree to take the assessment in a proctored, fullscreen environment.</span>
          </label>
        </div>

        {/* Action Button */}
        <div className="coding-intro-footer">
          <button
            className={`btn-start-coding ${!agreed || loading ? 'btn-start-coding--disabled' : ''}`}
            disabled={!agreed || loading}
            onClick={handleStart}
          >
            {loading ? (
              <>
                <span className="spinner-sm" /> Initializing Environment...
              </>
            ) : (
              <>
                <i className="ti ti-player-play" /> Start Coding Round
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

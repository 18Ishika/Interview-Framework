import React, { useMemo, useState } from 'react';
import './ProfileIdCard.css';

/**
 * Deterministic barcode: the same ID number always produces the same bars,
 * so the card looks issued rather than random on every render.
 */
function Barcode({ value, className = '' }) {
  const { bars, width } = useMemo(() => {
    const seed = String(value || 'IQ000000').padEnd(12, '0');
    const list = [];
    let x = 0;
    for (let i = 0; i < 46; i++) {
      const code = seed.charCodeAt(i % seed.length) + i * 7;
      const w = (code % 3) + 1;
      const gap = ((code >> 2) % 2) + 1;
      list.push({ x, w });
      x += w + gap;
    }
    return { bars: list, width: x };
  }, [value]);

  return (
    <svg
      className={`pid-barcode ${className}`}
      viewBox={`0 0 ${width} 24`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="24" />
      ))}
    </svg>
  );
}

function PersonGlyph() {
  return (
    <svg className="pid-photo-empty" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20c.7-3.9 3.8-6 7.5-6s6.8 2.1 7.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Props
 *  name, role, idNumber, issued   strings shown on the front
 *  status                         'ready' | 'progress' | 'none'
 *  statusLabel                    text for the status pill
 *  readyScore                     0-100
 *  photoUrl                       profile image URL (optional)
 *  onPhotoClick                   called when the photo is clicked (opens file picker)
 *  skills, recommendations        string arrays for the back
 *  education                      string array for the back
 *  children                       rendered in the action row beside "Flip card"
 */
export default function ProfileIdCard({
  name,
  role,
  idNumber,
  issued,
  status = 'progress',
  statusLabel,
  readyScore = 0,
  photoUrl,
  onPhotoClick,
  skills = [],
  recommendations = [],
  education = [],
  children,
}) {
  const [flipped, setFlipped] = useState(false);

  const shownSkills = skills.slice(0, 6);
  const extraSkills = Math.max(0, skills.length - shownSkills.length);

  return (
    <div className="pid-wrap">
      <div className="pid-stage">
        <div className={`pid-card${flipped ? ' is-flipped' : ''}`}>

          {/* ───────────── Front ───────────── */}
          <section className="pid-face pid-front" aria-hidden={flipped} aria-label="ID card front">
            <span className="pid-slot" aria-hidden="true" />

            <header className="pid-band">
              <span className="pid-brand">InterviewIQ</span>
              <span className={`pid-status pid-status--${status}`}>
                {statusLabel}
              </span>
            </header>

            <div className="pid-body">
              <button
                type="button"
                className="pid-photo"
                onClick={onPhotoClick}
                tabIndex={flipped ? -1 : 0}
                title="Change profile photo"
                aria-label="Change profile photo"
              >
                {photoUrl ? <img src={photoUrl} alt="" /> : <PersonGlyph />}
                <span className="pid-photo-hint">Change photo</span>
              </button>

              <dl className="pid-fields">
                <div className="pid-field pid-field--wide">
                  <dt>Name</dt>
                  <dd className="pid-name">{name}</dd>
                </div>
                <div className="pid-field pid-field--wide">
                  <dt>Target role</dt>
                  <dd>{role}</dd>
                </div>
                <div className="pid-field">
                  <dt>ID number</dt>
                  <dd className="pid-mono">{idNumber}</dd>
                </div>
                <div className="pid-field">
                  <dt>Member since</dt>
                  <dd>{issued}</dd>
                </div>
              </dl>
            </div>

            <footer className="pid-foot">
              <div className="pid-barcode-wrap">
                <Barcode value={idNumber} />
                <span className="pid-mono pid-barcode-num">{idNumber}</span>
              </div>

              <div className={`pid-seal pid-seal--${status}`} aria-label={`Ready score ${readyScore} percent`}>
                <span className="pid-seal-score">{readyScore}%</span>
                <span className="pid-seal-label">Ready</span>
              </div>
            </footer>
          </section>

          {/* ───────────── Back ───────────── */}
          <section className="pid-face pid-back" aria-hidden={!flipped} aria-label="ID card back">
            <div className="pid-stripe" />

            <div className="pid-back-body">
              <div className="pid-block">
                <h4>Core skills</h4>
                {shownSkills.length > 0 ? (
                  <div className="pid-chips">
                    {shownSkills.map((s, i) => (
                      <span key={i} className="pid-chip">{s}</span>
                    ))}
                    {extraSkills > 0 && <span className="pid-chip pid-chip--more">+{extraSkills} more</span>}
                  </div>
                ) : (
                  <p className="pid-empty">Upload a resume to fill this in.</p>
                )}
              </div>

              <div className="pid-block">
                <h4>Top job matches</h4>
                {recommendations.length > 0 ? (
                  <div className="pid-chips">
                    {recommendations.map((r, i) => (
                      <span key={i} className="pid-chip pid-chip--accent">{r}</span>
                    ))}
                  </div>
                ) : (
                  <p className="pid-empty">Matches appear after your resume is parsed.</p>
                )}
              </div>

              <div className="pid-block">
                <h4>Education</h4>
                {education.length > 0 ? (
                  <p className="pid-edu">{education[0]}</p>
                ) : (
                  <p className="pid-empty">No education added yet.</p>
                )}
              </div>
            </div>

            <footer className="pid-back-foot">
              <span className="pid-fineprint">Issued by InterviewIQ. Valid only with the ID number shown.</span>
              <Barcode value={idNumber} className="pid-barcode--small" />
            </footer>
          </section>
        </div>
      </div>

      <div className="pid-actions">
        <button type="button" className="btn-secondary pid-flip" onClick={() => setFlipped(f => !f)}>
          {flipped ? 'Show front' : 'Flip card'}
        </button>
        {children}
      </div>
    </div>
  );
}
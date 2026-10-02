import React from 'react';
import Reveal from './Reveal';

/* ---------- Illustrations ----------
   Each one animates when its card scrolls into view and resets when it leaves,
   so it replays every time the user scrolls past. */

const Viz = ({ bg, chip, children }) => (
  <div
    style={{
      position: 'relative',
      background: bg,
      borderRadius: 'calc(var(--radius-lg) - 6px)',
      height: 150,
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}
  >
    {children}
    <span
      className="fx-chip"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        color: 'var(--color-evergreen)',
        background: 'var(--color-bg-secondary)',
        borderRadius: 99,
        padding: '4px 10px',
      }}
    >
      {chip}
    </span>
  </div>
);

/* 1. Answer scoring: an answer card with a score ring */
const ScoreViz = () => (
  <Viz bg="var(--color-primary-light)" chip="Relevant">
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: 'var(--color-bg-secondary)',
        borderRadius: 14,
        padding: '16px 20px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <svg viewBox="0 0 80 80" width="72" height="72" aria-hidden="true">
        <circle cx="40" cy="40" r="28" fill="none" stroke="rgba(0,32,11,0.1)" strokeWidth="8" />
        <circle
          className="fx-ring-prog"
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke="var(--color-evergreen)"
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" fontSize="18" fontWeight="700" fontFamily="var(--font-display)" fill="var(--color-evergreen)">
          87
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[84, 62, 74].map((w, i) => (
          <div key={i} style={{ width: 84, height: 6, borderRadius: 99, background: 'rgba(0,32,11,0.1)', overflow: 'hidden' }}>
            <div className="fx-bar" style={{ width: `${w}%`, height: '100%', background: 'var(--color-primary)', animationDelay: `${0.5 + i * 0.15}s` }} />
          </div>
        ))}
      </div>
    </div>
  </Viz>
);

/* 2. Eye contact: an eye whose gaze moves around the screen */
const EyeViz = () => (
  <Viz bg="var(--color-sage)" chip="Eye contact 92%">
    <svg viewBox="0 0 200 110" width="82%" height="100%" aria-hidden="true">
      <defs>
        <clipPath id="fxEyeClip">
          <path d="M18 58 Q100 6 182 58 Q100 110 18 58Z" />
        </clipPath>
      </defs>
      <path d="M18 58 Q100 6 182 58 Q100 110 18 58Z" fill="var(--color-bg-secondary)" />
      <g clipPath="url(#fxEyeClip)">
        <g className="fx-iris">
          <circle cx="100" cy="58" r="27" fill="var(--color-primary)" />
          <circle cx="100" cy="58" r="12" fill="var(--color-evergreen)" />
          <circle cx="107" cy="51" r="4" fill="#fff" opacity="0.9" />
        </g>
      </g>
      <path
        className="fx-eye-outline"
        d="M18 58 Q100 6 182 58 Q100 110 18 58Z"
        fill="none"
        stroke="var(--color-evergreen)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  </Viz>
);

/* 3. Expression: face detection frame + landmarks, neutral face breaks into a smile */
const ExpressionViz = () => (
  <Viz bg="#F3DFC2" chip="Confident">
    <svg viewBox="0 0 200 110" width="82%" height="100%" aria-hidden="true">
      {/* face */}
      <ellipse cx="100" cy="56" rx="36" ry="41" fill="var(--color-bg-secondary)" stroke="var(--color-evergreen)" strokeWidth="2.5" />
      {/* brows */}
      <path d="M79 38 Q87 33 95 37" fill="none" stroke="var(--color-evergreen)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M105 37 Q113 33 121 38" fill="none" stroke="var(--color-evergreen)" strokeWidth="2.5" strokeLinecap="round" />
      {/* eyes (blink now and then) */}
      <ellipse className="fx-blink" cx="87" cy="48" rx="3.8" ry="4.4" fill="var(--color-evergreen)" />
      <ellipse className="fx-blink" cx="113" cy="48" rx="3.8" ry="4.4" fill="var(--color-evergreen)" />
      {/* nose */}
      <path d="M100 52 L97.5 63 Q100 65.5 103 63" fill="none" stroke="rgba(0,32,11,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* mouth: neutral line fades, smile draws */}
      <path className="fx-neutral" d="M89 76 L111 76" fill="none" stroke="var(--color-evergreen)" strokeWidth="3" strokeLinecap="round" />
      <path className="fx-smile" d="M86 72 Q100 90 114 72" fill="none" stroke="var(--color-evergreen)" strokeWidth="3" strokeLinecap="round" />
      {/* detection brackets */}
      <g className="fx-br" fill="none" stroke="var(--color-primary-mid)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 22 V10 H64" />
        <path d="M148 22 V10 H136" />
        <path d="M52 90 V102 H64" />
        <path d="M148 90 V102 H136" />
      </g>
      {/* landmarks */}
      {[[79, 48], [121, 48], [86, 72], [114, 72], [100, 63]].map(([x, y], i) => (
        <circle key={i} className="fx-lm" cx={x} cy={y} r="2.6" fill="var(--color-primary)" stroke="var(--color-evergreen)" strokeWidth="1.2" style={{ animationDelay: `${0.7 + i * 0.12}s` }} />
      ))}
    </svg>
  </Viz>
);

/* 4. Posture: solid head-and-shoulders silhouette that straightens up */
const PostureViz = () => (
  <Viz bg="#EFE6D2" chip="Upright">
    <svg viewBox="0 0 200 110" width="82%" height="100%" aria-hidden="true">
      <line x1="100" y1="4" x2="100" y2="106" stroke="rgba(0,32,11,0.28)" strokeWidth="2" strokeDasharray="4 5" />
      <g className="fx-bust">
        {/* shoulders */}
        <path d="M46 112 L46 94 Q46 70 82 63 L118 63 Q154 70 154 94 L154 112 Z" fill="var(--color-evergreen)" />
        {/* head */}
        <g className="fx-head">
          <rect x="79" y="8" width="42" height="50" rx="20" fill="var(--color-evergreen)" />
        </g>
      </g>
    </svg>
  </Viz>
);

const features = [
  { title: 'Semantic answer scoring', desc: 'Checks what you said, not just how many keywords you hit.', Visual: ScoreViz },
  { title: 'Eye contact detection', desc: 'Tracks how steadily you look at the camera.', Visual: EyeViz },
  { title: 'Facial expression analysis', desc: 'Reads how calm and confident you come across.', Visual: ExpressionViz },
  { title: 'Posture and body language', desc: 'Flags slouching, fidgeting and distracting movement.', Visual: PostureViz },
];

const FeatureCard = ({ title, desc, Visual }) => (
  <div
    style={{
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 10,
      height: '100%',
      transition: 'transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <Visual />
    <div style={{ padding: '0 12px 14px' }}>
      <h4
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: '0 0 8px',
          lineHeight: 1.25,
        }}
      >
        {title}
      </h4>
      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{desc}</p>
    </div>
  </div>
);

const Features = () => {
  return (
    <section
      id="features"
      style={{ background: 'var(--color-bg-secondary)', padding: '96px 40px', overflow: 'hidden' }}
    >
      {/* Base = resting/hidden state. Animations only exist under .is-visible,
          so leaving the viewport resets them and they replay on re-entry. */}
      <style>{`
        .fx-bar { transform-origin: 0 50%; transform: scaleX(0); }
        .fx-ring-prog { stroke-dasharray: 176; stroke-dashoffset: 176; }
        .fx-eye-outline { stroke-dasharray: 420; stroke-dashoffset: 420; }
        .fx-bust { transform-origin: 100px 110px; transform: rotate(10deg); }
        .fx-head { transform: translate(10px, 5px) rotate(8deg); transform-origin: 100px 58px; }
        .fx-br { transform-origin: 100px 56px; transform: scale(1.22); opacity: 0; }
        .fx-lm { transform-box: fill-box; transform-origin: center; transform: scale(0); }
        .fx-smile { stroke-dasharray: 60; stroke-dashoffset: 60; }
        .fx-blink { transform-box: fill-box; transform-origin: center; }
        .fx-chip { opacity: 0; transform: translateY(6px); }

        .is-visible .fx-bar { animation: fxBar 1.1s var(--ease-out) forwards; }
        .is-visible .fx-ring-prog { animation: fxRingProg 1.5s var(--ease-out) 0.3s forwards; }
        .is-visible .fx-eye-outline { animation: fxDraw 1.2s var(--ease-out) 0.1s forwards; }
        .is-visible .fx-iris { animation: fxLook 4.5s ease-in-out 1s infinite; }
        .is-visible .fx-bust { animation: fxSit 1.5s var(--ease-out) 0.35s forwards; }
        .is-visible .fx-head { animation: fxHead 1.5s var(--ease-out) 0.35s forwards; }
        .is-visible .fx-br { animation: fxBracket 0.9s var(--ease-out) 0.2s forwards; }
        .is-visible .fx-lm { animation: fxPop 0.45s var(--ease-out) forwards; }
        .is-visible .fx-neutral { animation: fxFade 0.4s ease 1.2s forwards; }
        .is-visible .fx-smile { animation: fxDraw60 0.7s var(--ease-out) 1.2s forwards; }
        .is-visible .fx-blink { animation: fxBlink 4s ease-in-out 2.5s infinite; }
        .is-visible .fx-chip { animation: fxChip 0.6s var(--ease-out) 1.1s forwards; }

        @keyframes fxBar { to { transform: scaleX(1); } }
        @keyframes fxRingProg { to { stroke-dashoffset: 23; } }
        @keyframes fxDraw { to { stroke-dashoffset: 0; } }
        @keyframes fxLook {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-15px, -3px); }
          55% { transform: translate(15px, 4px); }
          80% { transform: translate(-4px, 2px); }
        }
        @keyframes fxSit { to { transform: rotate(0deg); } }
        @keyframes fxHead { to { transform: translate(0, 0) rotate(0deg); } }
        @keyframes fxBracket { to { transform: scale(1); opacity: 1; } }
        @keyframes fxPop { to { transform: scale(1); } }
        @keyframes fxFade { to { opacity: 0; } }
        @keyframes fxDraw60 { to { stroke-dashoffset: 0; } }
        @keyframes fxBlink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
        @keyframes fxChip { to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .fx-bar, .fx-bust, .fx-head, .fx-lm { transform: none; }
          .fx-br { transform: none; opacity: 1; }
          .fx-smile { stroke-dashoffset: 0; }
          .fx-neutral { opacity: 0; }
          .fx-ring-prog { stroke-dashoffset: 23; }
          .fx-eye-outline { stroke-dashoffset: 0; }
          .fx-chip { opacity: 1; transform: none; }
          .is-visible .fx-bar, .is-visible .fx-ring-prog, .is-visible .fx-eye-outline,
          .is-visible .fx-iris, .is-visible .fx-bust, .is-visible .fx-head, .is-visible .fx-br,
          .is-visible .fx-lm, .is-visible .fx-neutral, .is-visible .fx-smile, .is-visible .fx-blink,
          .is-visible .fx-chip { animation: none; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal direction="left" style={{ marginBottom: 44 }}>
          <div className="section-label">The InterviewIQ Platform</div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.4vw, 38px)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 12,
            }}
          >
            Four dimensions, one session.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', maxWidth: 420 }}>
            Each practice session evaluates four critical interview dimensions simultaneously.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {features.map((f, i) => (
            <Reveal key={f.title} direction="scale" delay={i * 140}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
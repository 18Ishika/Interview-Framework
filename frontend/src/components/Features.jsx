import React from 'react';

const features = [
  {
    icon: '💬',
    iconBg: 'var(--color-primary-light)',
    iconColor: 'var(--color-primary)',
    title: 'Semantic answer scoring',
    desc: 'Evaluates semantic depth and relevance of your answers using AI.',
  },
  {
    icon: '👁️',
    iconBg: 'var(--color-teal-bg)',
    iconColor: 'var(--color-teal-fg)',
    title: 'Eye contact detection',
    desc: 'Identifies and helps you improve eye contact in real time.',
  },
  {
    icon: '😊',
    iconBg: 'var(--color-amber-bg)',
    iconColor: 'var(--color-amber-fg)',
    title: 'Facial expression analysis',
    desc: 'Analyses social, facial cues and emotional expression.',
  },
  {
    icon: '🧍',
    iconBg: 'var(--color-coral-bg)',
    iconColor: 'var(--color-coral-fg)',
    title: 'Posture and body language',
    desc: 'Detects and scores posture and body language throughout.',
  },
];

const FeatureCard = ({ icon, iconBg, iconColor, title, desc }) => (
  <div style={{
    background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.borderColor = 'var(--color-primary-mid)';
    e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,71,255,0.08)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.borderColor = 'var(--color-border)';
    e.currentTarget.style.boxShadow = 'none';
  }}
  >
    <div style={{
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-md)',
      background: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
    }}>
      {icon}
    </div>
    <h4 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-text-primary)',
    }}>{title}</h4>
    <p style={{
      fontSize: 13,
      color: 'var(--color-text-secondary)',
      lineHeight: 1.6,
    }}>{desc}</p>
  </div>
);

const Features = () => {
  return (
    <section id="features" style={{
      background: 'var(--color-bg-secondary)',
      padding: '80px 40px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">The InterviewIQ Platform</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 10,
          }}>
            Four dimensions, one session.
          </h2>
          <p style={{
            fontSize: 15,
            color: 'var(--color-text-secondary)',
            maxWidth: 420,
          }}>
            Each practice session evaluates four critical interview dimensions simultaneously.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </div>
    </section>
  );
};

export default Features;

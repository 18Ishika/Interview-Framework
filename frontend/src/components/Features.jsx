import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faUser } from '@fortawesome/free-solid-svg-icons';
import { faEye, faFaceSmile } from '@fortawesome/free-regular-svg-icons';

const features = [
  {
    icon: faCloud,
    title: 'Semantic answer scoring',
  },
  {
    icon: faEye,
    title: 'Eye contact detection',
  },
  {
    icon: faFaceSmile,
    title: 'Facial expression analysis',
  },
  {
    icon: faUser,
    title: 'Posture and body language',
  },
];


const FeatureCard = ({ icon, title }) => (
  <div
    style={{
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--color-primary-mid)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--color-border)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-primary-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ color: 'var(--color-primary-dark)', fontSize: 17 }} />
    </div>
    <h4
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        margin: 0,
      }}
    >
      {title}
    </h4>
  </div>
);

const Features = () => {
  return (
    <section
      id="features"
      style={{
        background: 'var(--color-bg-secondary)',
        padding: '80px 40px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">The InterviewIQ Platform</div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 10,
            }}
          >
            Four dimensions, one session.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-text-secondary)',
              maxWidth: 420,
            }}
          >
            Each practice session evaluates four critical interview dimensions simultaneously.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
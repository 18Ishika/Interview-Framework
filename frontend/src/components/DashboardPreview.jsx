import React from 'react';

const metrics = [
  { value: '$5.0M', label: 'Sessions' },
  { value: '$$$', label: 'Plan' },
  { value: '13.2k', label: 'Students' },
  { value: '3.3k', label: 'Reports' },
];

const bars = [35, 55, 80, 65, 90, 50, 70, 100];

const DashboardPreview = () => {
  return (
    <section style={{
      background: 'var(--color-bg-secondary)',
      padding: '80px 40px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 64,
        alignItems: 'center',
      }}>

        {/* Left: Works anywhere */}
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
            marginBottom: 14,
          }}>
            Works anywhere,<br />no special hardware needed.
          </h2>
          <p style={{
            fontSize: 15,
            color: 'var(--color-text-secondary)',
            marginBottom: 28,
            lineHeight: 1.7,
          }}>
            Runs on a standard webcam and browser. Available online and offline —
            built for students and institutions alike.
          </p>

          <button style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            marginBottom: 36,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          >
            Get started free
          </button>

          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { value: '3-in-1', label: 'Knowledge, communication & confidence' },
              { value: 'PDF', label: 'Downloadable feedback report' },
              { value: '∞', label: 'Reattempts allowed' },
            ].map(({ value, label }) => (
              <div key={value}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}>{value}</div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  marginTop: 4,
                  lineHeight: 1.4,
                  maxWidth: 100,
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dashboard preview */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Institution Dashboard</div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
          }}>
            Institution Dashboard Preview.
          </h3>
          <p style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            marginBottom: 20,
          }}>
            Track cohort performance, trends, and reports at scale.
          </p>

          {/* Dashboard mockup */}
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(108,71,255,0.08)',
          }}>
            {/* Titlebar */}
            <div style={{
              background: 'var(--color-primary)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                }} />
              ))}
              <span style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                marginLeft: 4,
              }}>InterviewIQ — Institution Dashboard</span>
            </div>

            {/* Metrics row */}
            <div style={{ padding: 16 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
                marginBottom: 14,
              }}>
                {metrics.map(({ value, label }) => (
                  <div key={label} style={{
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                    }}>{value}</div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                      marginTop: 2,
                    }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div style={{
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                height: 80,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 6,
              }}>
                {bars.map((h, i) => (
                  <div key={i} style={{
                    flex: 1,
                    height: `${h}%`,
                    background: h >= 80 ? 'var(--color-primary)' : 'var(--color-primary-light)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
            </div>
          </div>

          <button style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '11px 22px',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            marginTop: 16,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          >
            Get started free
          </button>
        </div>

      </div>
    </section>
  );
};

export default DashboardPreview;

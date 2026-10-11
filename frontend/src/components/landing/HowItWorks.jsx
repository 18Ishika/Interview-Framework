import React, { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';

const STEP_MS = 650;

const steps = [
  {
    num: '01',
    title: 'Select domain',
    desc: 'Runs on a standard webcam and browser. Pick your interview domain to start.',
    fill: 'var(--color-bg-secondary)',
  },
  {
    num: '02',
    title: 'Attempt the three rounds',
    desc: 'One session covers all three main rounds.',
    fill: 'var(--color-sage)',
    rounds: ['Technical', 'Coding', 'HR interview'],
  },
  {
    num: '03',
    title: 'Get scored and download',
    desc: 'Receive an instant AI score across all four dimensions, plus a detailed PDF report.',
    fill: 'var(--color-gold)',
  },
  {
    num: '04',
    title: 'Reattempt and improve',
    desc: 'Come back for more attempts and track your improvement over time.',
    fill: 'var(--color-primary-light)',
  },
];

const HowItWorks = () => {
  const rowRef = useRef(null);
  const [active, setActive] = useState(0);

  // Fill the cards in one after another every time the row scrolls into view;
  // reset when it leaves so the sequence replays on the next pass.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setActive(steps.length);
      return;
    }
    let timer;
    const io = new IntersectionObserver(
      ([entry]) => {
        clearInterval(timer);
        if (!entry.isIntersecting) {
          setActive(0);
          return;
        }
        let n = 0;
        timer = setInterval(() => {
          n += 1;
          setActive(n);
          if (n >= steps.length) clearInterval(timer);
        }, STEP_MS);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, []);

  return (
    <section
      id="how-it-works"
      style={{ background: 'var(--color-bg-primary)', padding: '96px 40px', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal direction="left" style={{ marginBottom: 48 }}>
          <div className="section-label">How it works</div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.4vw, 38px)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 12,
            }}
          >
            From attempt to improvement.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', maxWidth: 520 }}>
            Four straightforward steps to measurable progress. Every attempt covers our three main rounds:
            technical, coding and HR interview.
          </p>
        </Reveal>

        <div
          ref={rowRef}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}
        >
          {steps.map((step, i) => {
            const on = i < active;
            return (
              <div
                key={step.num}
                style={{
                  position: 'relative',
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '18px 20px 20px',
                  borderRadius: 'var(--radius-xl)',
                  border: `1px solid ${on ? 'rgba(0,32,11,0.12)' : 'var(--color-border)'}`,
                  background: on ? step.fill : 'transparent',
                  opacity: on ? 1 : 0.4,
                  transform: on ? 'translateY(0) scale(1)' : 'translateY(22px) scale(0.97)',
                  transition: 'all 0.8s var(--ease-out)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 38,
                    fontWeight: 600,
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                    color: 'var(--color-evergreen)',
                    opacity: on ? 1 : 0.25,
                    transition: 'opacity 0.8s var(--ease-out)',
                  }}
                >
                  {step.num}
                </div>

                <div>
                  <h4
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 17,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: 'var(--color-evergreen)',
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </h4>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(0,32,11,0.75)' }}>{step.desc}</p>

                  {step.rounds && (
                    <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
                      {step.rounds.map((r, ri) => (
                        <li
                          key={r}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-evergreen)',
                            padding: '6px 0',
                            borderTop: '1px solid rgba(0,32,11,0.2)',
                            opacity: on ? 1 : 0,
                            transform: on ? 'translateX(0)' : 'translateX(-10px)',
                            transition: `all 0.6s var(--ease-out) ${0.35 + ri * 0.15}s`,
                          }}
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
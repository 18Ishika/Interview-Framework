import { useState, useRef, useEffect, useCallback } from 'react';

function PrimaryButton({ children, onClick, disabled, style }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        background: hovered && !disabled ? 'var(--color-primary-hover)' : 'var(--color-primary-dark)',
        color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '12px 24px',
        fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background 0.15s, opacity 0.15s', ...style,
      }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >{children}</button>
  );
}

function GhostButton({ children, onClick, disabled, style }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        background: hovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', padding: '12px 24px', fontSize: 14, fontWeight: 600,
        fontFamily: 'var(--font-body)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, transition: 'background 0.15s', ...style,
      }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >{children}</button>
  );
}

function Badge({ children, variant = 'blue' }) {
  const colors = {
    blue: { bg: '#EBF3FB', color: 'var(--color-primary-dark)' },
    green: { bg: '#EAF6F0', color: '#2A7A52' },
  };
  const c = colors[variant];
  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.color, fontSize: 11,
      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 'var(--radius-full)',
    }}>{children}</span>
  );
}

function MicBars({ analyserRef, barCount = 8, active }) {
  const barsRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active || !analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const frame = () => {
      analyser.getByteFrequencyData(data);
      barsRef.current.forEach((el, i) => {
        if (el) el.style.height = Math.max(4, Math.round((data[i * 8] || 0) / 6)) + 'px';
      });
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, analyserRef]);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24 }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div key={i} ref={el => (barsRef.current[i] = el)}
          style={{ width: 4, height: 6, borderRadius: 2, background: 'var(--color-primary)', transition: 'height 0.08s' }} />
      ))}
    </div>
  );
}

function CheckRow({ icon, label, statusText, state, extra, last }) {
  const iconBg = { idle: 'var(--color-bg-tertiary)', pass: '#EAF6F0', fail: '#FDF0EF', loading: '#EBF3FB' }[state];
  const iconColor = { idle: 'var(--color-text-muted)', pass: '#2A7A52', fail: 'var(--color-danger)', loading: 'var(--color-primary)' }[state];
  const dotColor = { idle: 'var(--color-border-strong)', pass: '#2A7A52', fail: 'var(--color-danger)', loading: 'var(--color-primary)' }[state];

  const StateIcon = () => {
    if (state === 'pass') return <span>✓</span>;
    if (state === 'fail') return <span>✕</span>;
    if (state === 'loading') return <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>↻</span>;
    return <span>{icon}</span>;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--color-border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, transition: 'background 0.2s, color 0.2s' }}>
        <StateIcon />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{statusText}</div>
      </div>
      {extra || <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, transition: 'background 0.2s' }} />}
    </div>
  );
}

function CheckScreen({ onContinue }) {
  const [camState, setCamState] = useState('idle');
  const [micState, setMicState] = useState('idle');
  const [camMsg, setCamMsg] = useState('Not checked yet');
  const [micMsg, setMicMsg] = useState('Not checked yet');
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const runChecks = useCallback(async () => {
    setFailed(false);
    setCamState('loading'); setCamMsg('Requesting access…');
    setMicState('loading'); setMicMsg('Requesting access…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamState('pass'); setCamMsg('Camera detected');
      setMicState('pass'); setMicMsg('Microphone active');
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setChecked(true);
    } catch {
      setCamState('fail'); setCamMsg('Permission denied or device not found');
      setMicState('fail'); setMicMsg('Permission denied or device not found');
      setFailed(true);
    }
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
        System check
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        Allow camera and mic access when your browser prompts you.
      </p>

      <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <video ref={videoRef} autoPlay muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: camState === 'pass' ? 'block' : 'none' }} />
        {camState !== 'pass' && (
          <div style={{ color: '#666', fontSize: 13, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            Camera preview
          </div>
        )}
      </div>

      <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '0 18px', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
        <CheckRow icon="📷" label="Camera" statusText={camMsg} state={camState} />
        <CheckRow icon="🎤" label="Microphone" statusText={micMsg} state={micState}
          extra={micState === 'pass' ? <MicBars analyserRef={analyserRef} barCount={5} active={true} /> : undefined} last />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {!checked ? (
          <PrimaryButton onClick={runChecks} style={{ flex: 1 }}>
            {failed ? 'Retry check' : 'Check devices'}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => onContinue({ stream: streamRef.current })} style={{ flex: 1 }}>
            Begin interview →
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

function SuccessScreen({ onBeginReal, onRestart }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#EAF6F0', color: '#2A7A52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px' }}>✓</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>
        All systems green
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: '0 auto 32px', maxWidth: 320 }}>
        Camera and mic are working. You're ready for the real interview.
      </p>

      <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '0 18px', boxShadow: 'var(--shadow-sm)', marginBottom: 24, textAlign: 'left' }}>
        {[{ label: 'Camera' }, { label: 'Microphone' }].map((item, i, arr) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF6F0', color: '#2A7A52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{item.label}</div>
            <Badge variant="green">Ready</Badge>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onBeginReal} style={{ width: '100%', maxWidth: 280, marginBottom: 12 }}>
        Begin real interview →
      </PrimaryButton>
      <div>
        <GhostButton onClick={onRestart} style={{ width: '100%', maxWidth: 280 }}>Start over</GhostButton>
      </div>
    </div>
  );
}

export default function InterviewPreflight({ onBeginRealInterview }) {
  const [screen, setScreen] = useState('check');

  return (
    <section style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['check', 'success'].map((s) => (
          <div key={s} style={{ width: s === screen ? 20 : 8, height: 8, borderRadius: 'var(--radius-full)', background: s === screen ? 'var(--color-primary-dark)' : 'var(--color-border-strong)', transition: 'width 0.2s, background 0.2s' }} />
        ))}
      </div>

      <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>
        {screen === 'check' && (
          <CheckScreen onContinue={() => setScreen('success')} />
        )}
        {screen === 'success' && (
          <SuccessScreen
            onBeginReal={() => onBeginRealInterview?.()}
            onRestart={() => setScreen('check')}
          />
        )}
      </div>
    </section>
  );
}
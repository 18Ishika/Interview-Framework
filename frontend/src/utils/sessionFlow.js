// "Start a Session": runs coding -> technical -> hr back to back.
const KEY = 'ivq_session_flow';

export function startSession(navigate, { role, jd }) {
  sessionStorage.setItem(KEY, JSON.stringify({ queue: ['technical', 'hr'], role, jd }));
  navigate('/coding-round');
}

export function hasNextRound() {
  try {
    return (JSON.parse(sessionStorage.getItem(KEY))?.queue || []).length > 0;
  } catch {
    return false;
  }
}

export function isSessionActive() {
  try {
    return Boolean(sessionStorage.getItem(KEY));
  } catch {
    return false;
  }
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

// Go to the next round in the session, or to `fallback` if no session is active.
export function goNext(navigate, fallback = '/dashboard') {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(KEY)); } catch { /* ignore */ }
  if (!s?.queue?.length) {
    clearSession();
    navigate(fallback, { replace: true });
    return;
  }
  const type = s.queue.shift();
  sessionStorage.setItem(KEY, JSON.stringify(s));
  if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => { });
  }

  // When moving to HR, bypass the redundant preflight check since camera/mic are already verified in Technical round
  if (type === 'hr') {
    navigate('/interview/hr', { replace: true, state: { type, role: s.role, jd: s.jd } });
  } else {
    navigate('/interview/preflight', { replace: true, state: { type, role: s.role, jd: s.jd } });
  }
}


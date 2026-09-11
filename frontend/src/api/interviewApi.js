const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_ROOT = configuredApiUrl
  .replace(/\/$/, "")
  .replace(/\/(?:tech-int|hr-int|interview)\/?$/, "");
const BASE_URL = `${API_ROOT}/tech-int`;
const HR_BASE_URL = `${API_ROOT}/hr-int`;
const INTERVIEW_SESSIONS_URL = `${API_ROOT}/interview`;

async function authFetch(url, options = {}, getToken) {
  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers ,credentials:"include"});
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const startInterview = (role, getToken) =>
  authFetch(`${BASE_URL}/start/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  }, getToken);

export const startHrInterview = (getToken) => {
  return authFetch(`${HR_BASE_URL}/start/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }, getToken);
};

export const getQuestion = (getToken) =>
  authFetch(`${BASE_URL}/question/`, {}, getToken);

export const evaluateAnswer = (audioBlob, getToken) => {
  const form = new FormData();
  form.append("audio", audioBlob, "answer.wav");
  return authFetch(`${BASE_URL}/evaluate/`, { method: "POST", body: form }, getToken);
};

export const getResults = (getToken) =>
  authFetch(`${BASE_URL}/results/`, {}, getToken);

export const getInterviewStatus = (getToken) =>
  authFetch(`${BASE_URL}/status/`, {}, getToken);

export const fetchQuestionAudio = async (getToken) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/question-audio/`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch audio");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

// HR QnA Endpoints
export const getHrQuestion = (getToken) =>
  authFetch(`${HR_BASE_URL}/question/`, {}, getToken);

export const evaluateHrAnswer = (audioBlob, getToken) => {
  const form = new FormData();
  form.append("audio", audioBlob, "answer.wav");
  return authFetch(`${HR_BASE_URL}/evaluate/`, { method: "POST", body: form }, getToken);
};

export const getHrQnaResults = (getToken) =>
  authFetch(`${HR_BASE_URL}/results/`, {}, getToken);

export const fetchHrQuestionAudio = async (getToken) => {
  const token = await getToken();
  const res = await fetch(`${HR_BASE_URL}/question-audio/`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch audio");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const acknowledgeResult = (sessionId, roundType, getToken) => {
  try {
    sessionStorage.removeItem('cached_profile_details');
  } catch (e) {}
  return authFetch(`${BASE_URL}/acknowledge/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, round_type: roundType }),
  }, getToken);
};

export const getPendingNotifications = (getToken) =>
  authFetch(`${BASE_URL}/notifications/pending/`, {}, getToken);

export const getHrResults = (sessionId, getToken) => {
  return authFetch(`${HR_BASE_URL}/metrics/${sessionId}/`, {}, getToken);
};

export const getInterviewHistory = (getToken) =>
  authFetch(`${INTERVIEW_SESSIONS_URL}/history/`, {}, getToken);

export const getTechnicalResultsBySession = (sessionId, getToken) =>
  authFetch(`${INTERVIEW_SESSIONS_URL}/technical/results/${sessionId}/`, {}, getToken);
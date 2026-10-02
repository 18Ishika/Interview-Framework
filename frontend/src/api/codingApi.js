const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_ROOT = configuredApiUrl
  .replace(/\/$/, "")
  .replace(/\/(?:tech-int|hr-int|interview|coding-round)\/?$/, "");

const BASE_URL = `${API_ROOT}/coding-round`;

async function authFetch(url, options = {}, getToken) {
  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong with the coding server");
  return data;
}

export const startCodingRound = (getToken, payload = {}) =>
  authFetch(`${BASE_URL}/start/`, { method: "POST", body: JSON.stringify(payload) }, getToken);


export const runCodingCode = (payload, getToken) =>
  authFetch(`${BASE_URL}/run/`, { method: "POST", body: JSON.stringify(payload) }, getToken);

export const submitCodingQuestion = (payload, getToken) =>
  authFetch(`${BASE_URL}/submit-question/`, { method: "POST", body: JSON.stringify(payload) }, getToken);

export const finishCodingRound = (payload, getToken) =>
  authFetch(`${BASE_URL}/finish/`, { method: "POST", body: JSON.stringify(payload) }, getToken);

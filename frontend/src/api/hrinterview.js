import { config } from "../lib/config";

const BASE_URL = config.apiUrl;

export async function startHrInterview(getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/hr-interview/start/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to start HR interview");
  const data = await res.json();
  return data.session_id;
}

export async function uploadChunk(sessionId, index, blob, retries = 2) {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("chunk_index", index);
  formData.append("chunk", blob, `chunk_${index}.webm`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/hr-interview/upload-chunk/`, { method: "POST", body: formData });
      if (res.ok) return;
    } catch (e) {
      if (attempt === retries) throw e;
    }
  }
  throw new Error(`Chunk ${index} failed after retries`);
}

export async function finishHrUpload(sessionId, totalChunks) {
  const res = await fetch(`${BASE_URL}/hr-interview/finish-upload/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, total_chunks: totalChunks }),
  });
  if (!res.ok) throw new Error("Failed to finish upload");
  return res.json();
}

export async function getHrMetrics(sessionId, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/hr-interview/metrics/${sessionId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}
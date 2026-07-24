import { useEffect, useState } from "react";
import { getHrMetrics } from "../api/hrinterview";

export function usePollHrMetrics(sessionId, getToken, intervalMs = 5000) {
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState(sessionId ? "processing" : "idle");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const data = await getHrMetrics(sessionId, getToken);
        if (cancelled || !data) return;
        if (data.hr_status === "completed") {
          setMetrics(data);
          setStatus("completed");
          clearInterval(interval);
        } else if (data.hr_status === "failed") {
          setStatus("failed");
          clearInterval(interval);
        }
      } catch (e) {
        console.error(e);
      }
    }, intervalMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionId, getToken, intervalMs]);

  return { metrics, status };
}
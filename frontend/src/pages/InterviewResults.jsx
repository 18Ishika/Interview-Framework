import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { getResults } from "../api/interviewApi";
import "./InterviewSession.css";

export default function InterviewResults() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await getResults(getToken);
        if (res.status === "completed") {
          setReport(res.report);
        } else {
          setError("Results are not fully evaluated yet.");
        }
      } catch (err) {
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [getToken]);

  if (loading) {
    return (
      <div className="is-page">
        <div className="is-centered">
          <h2 className="is-heading">Loading Results...</h2>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="is-page">
        <div className="is-error-banner">
          ⚠️ {error || "No report available."}
        </div>
        <button className="is-btn-primary" style={{marginTop: '20px'}} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const ratingColor = {
    Excellent: "#16a34a",
    Good: "#22c55e",
    Average: "#d97706",
    "Needs Improvement": "#dc2626",
  }[report.overall_rating] || "var(--color-primary-dark)";

  const verdictStyle = (verdict) => ({
    background: verdict === "Strong Answer" ? "#f0fdf4" : verdict === "Good Attempt" ? "#fffbeb" : "#fef2f2",
    color: verdict === "Strong Answer" ? "#16a34a" : verdict === "Good Attempt" ? "#d97706" : "#dc2626",
  });

  return (
    <div className="is-page" style={{ padding: "40px 20px" }}>
      <div className="is-panel" style={{ margin: "0 auto" }}>
        <h2 className="is-heading" style={{ textAlign: "center", marginBottom: 8 }}>Interview Complete 🎉</h2>

        <div className="is-overview-row">
          <div className="is-overview-card">
            <span style={{ fontSize: 22, fontWeight: 700, color: ratingColor }}>{report.overall_rating}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Overall Rating</span>
          </div>
        </div>

        <div className="is-transcript" style={{ marginBottom: 24 }}>
          <p className="is-transcript-label">Summary</p>
          <p className="is-transcript-text">{report.overall_summary}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {report.per_question_feedback?.map((q, i) => (
            <div key={i} className="is-result-item">
              <div className="is-result-header">
                <span className="is-result-num">Q{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-secondary)" }}>{q.question}</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 99, ...verdictStyle(q.verdict) }}>
                  {q.verdict}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--color-text-primary)", marginTop: 6, marginBottom: 8 }}>{q.feedback}</p>

              {q.matched_keywords?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 6 }}>Got:</span>
                  {q.matched_keywords.map((k) => (
                    <span key={k} className="is-kw-tag" style={{ background: "#f0fdf4", color: "#16a34a", marginRight: 4 }}>{k}</span>
                  ))}
                </div>
              )}
              {q.missed_keywords?.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 6 }}>Missed:</span>
                  {q.missed_keywords.map((k) => (
                    <span key={k} className="is-kw-tag" style={{ background: "#fef2f2", color: "#ef4444", marginRight: 4 }}>{k}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="is-btn-ghost" onClick={() => navigate('/dashboard')} style={{ flex: 1 }}>Back to Dashboard</button>
          <button className="is-btn-primary" onClick={() => navigate('/interview')} style={{ flex: 1 }}>Start New Interview</button>
        </div>
      </div>
    </div>
  );
}

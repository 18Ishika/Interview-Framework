import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { getInterviewHistory } from "../api/interviewApi";
import "./InterviewSession.css";

const ratingColor = {
  Excellent: "#16a34a",
  Good: "#22c55e",
  Average: "#d97706",
  "Needs Improvement": "#dc2626",
};

export default function InterviewHistory() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getInterviewHistory(getToken);
        setHistory(res.history || []);
      } catch (err) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [getToken]);

  if (loading) {
    return (
      <div className="is-page">
        <div className="is-centered">
          <h2 className="is-heading">Loading Previous Interviews...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="is-page" style={{ padding: "40px 20px" }}>
      <div className="is-panel" style={{ margin: "0 auto", maxWidth: 800 }}>
        <h2 className="is-heading" style={{ textAlign: "center", marginBottom: 24 }}>
          Previous Interviews
        </h2>

        {error && <div className="is-error-banner">⚠️ {error}</div>}

        {!error && history.length === 0 && (
          <p style={{ textAlign: "center", color: "#6b7280" }}>No past interviews yet.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {history.map((item) => (
            <div
              key={item.session_id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>{item.target_role || "Interview"}</p>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
                  {item.technical_submitted_at &&
                    `Technical: ${new Date(item.technical_submitted_at).toLocaleDateString()}`}
                  {item.technical_submitted_at && item.hr_submitted_at && " · "}
                  {item.hr_submitted_at &&
                    `HR: ${new Date(item.hr_submitted_at).toLocaleDateString()}`}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {item.technical_rating && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: ratingColor[item.technical_rating] || "#374151",
                    }}
                  >
                    {item.technical_rating}
                  </span>
                )}
                {item.tech_status === "completed" && (
                  <button
                    className="is-btn-ghost"
                    onClick={() =>
                      navigate("/interview/results", {
                        state: { sessionId: item.session_id, roundType: "technical" },
                      })
                    }
                  >
                    View
                  </button>
                )}
                {item.hr_status === "completed" && (
                  <button
                    className="is-btn-ghost"
                    onClick={() =>
                      navigate("/interview/results", {
                        state: { sessionId: item.session_id, roundType: "hr" },
                      })
                    }
                  >
                    View HR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          className="is-btn-primary"
          style={{ marginTop: 24, width: "100%" }}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
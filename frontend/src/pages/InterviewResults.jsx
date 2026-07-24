import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { getResults, getHrResults, getTechnicalResultsBySession } from "../api/interviewApi";
import HrResults from "../components/HrResults";
import "./InterviewSession.css";

export default function InterviewResults() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, roundType } = location.state || {};

  const [report, setReport] = useState(null);
  const [hrData, setHrData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        if (roundType === "hr") {
          if (!sessionId) throw new Error("Missing session id for HR results");
          const res = await getHrResults(sessionId, getToken);
          if (res.hr_status === "completed") {
            setHrData(res);
          } else {
            setError("Results are not fully evaluated yet.");
          }
        } else {
          const res = sessionId
            ? await getTechnicalResultsBySession(sessionId, getToken)
            : await getResults(getToken);
          if (res.status === "completed") {
            setReport(res.report);
          } else {
            setError("Results are not fully evaluated yet.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [getToken, sessionId, roundType]);

  if (loading) {
    return (
      <div className="is-page">
        <div className="is-centered">
          <h2 className="is-heading">Loading Results...</h2>
        </div>
      </div>
    );
  }

  if (error || (!report && !hrData)) {
    return (
      <div className="is-page">
        <div className="is-error-banner">⚠️ {error || "No report available."}</div>
        <button
          className="is-btn-primary"
          style={{ marginTop: "20px" }}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (roundType === "hr" && hrData) {
    return (
      <div className="is-page" style={{ padding: "40px 20px" }}>
        <div className="is-panel" style={{ margin: "0 auto" }}>
          <h2 className="is-heading" style={{ textAlign: "center", marginBottom: 8 }}>
            HR Interview Complete 🎉
          </h2>
          <HrResults metrics={hrData} />
          <div style={{ display: "flex", gap: "10px", marginTop: 24 }}>
            <button className="is-btn-ghost" onClick={() => navigate("/dashboard")} style={{ flex: 1 }}>
              Back to Dashboard
            </button>
            <button className="is-btn-primary" onClick={() => navigate("/interview")} style={{ flex: 1 }}>
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- technical report rendering ----
  const ratingColor =
    {
      Excellent: "#16a34a",
      Good: "#22c55e",
      Average: "#d97706",
      "Needs Improvement": "#dc2626",
    }[report.overall_rating] || "var(--color-primary-dark)";

  const verdictStyle = (verdict) => ({
    background:
      verdict === "Strong Answer" ? "#f0fdf4" : verdict === "Good Attempt" ? "#fffbeb" : "#fef2f2",
    color: verdict === "Strong Answer" ? "#16a34a" : verdict === "Good Attempt" ? "#d97706" : "#dc2626",
    border: `1px solid ${
      verdict === "Strong Answer" ? "#bbf7d0" : verdict === "Good Attempt" ? "#fde68a" : "#fecaca"
    }`,
  });

  return (
    <div className="is-page" style={{ padding: "40px 20px" }}>
      <div className="is-panel" style={{ margin: "0 auto", maxWidth: 800 }}>
        <h2 className="is-heading" style={{ textAlign: "center", marginBottom: 8 }}>
          Interview Complete 🎉
        </h2>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: ratingColor }}>
            {report.overall_rating}
          </div>
          <p style={{ color: "#6b7280", marginTop: 4 }}>{report.overall_summary}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {report.per_question_feedback.map((q, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <p style={{ fontWeight: 600, margin: 0 }}>
                  Q{idx + 1}. {q.question}
                </p>
                <span
                  style={{
                    ...verdictStyle(q.verdict),
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {q.verdict}
                </span>
              </div>

              <p style={{ color: "#374151", fontSize: 14, marginBottom: 10 }}>{q.feedback}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {q.matched_keywords?.map((k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 12,
                      background: "#f0fdf4",
                      color: "#16a34a",
                      border: "1px solid #bbf7d0",
                      borderRadius: 6,
                      padding: "2px 8px",
                    }}
                  >
                    ✓ {k}
                  </span>
                ))}
                {q.missed_keywords?.map((k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 12,
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: 6,
                      padding: "2px 8px",
                    }}
                  >
                    ✗ {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: 24 }}>
          <button className="is-btn-ghost" onClick={() => navigate("/dashboard")} style={{ flex: 1 }}>
            Back to Dashboard
          </button>
          <button className="is-btn-primary" onClick={() => navigate("/interview")} style={{ flex: 1 }}>
            Start New Interview
          </button>
        </div>
      </div>
    </div>
  );
}
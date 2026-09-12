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
  const [technicalMetrics, setTechnicalMetrics] = useState(null);
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

          const rawReport = res.report ?? res.ai_evaluation;
          const isCompleted = res.status === "completed" || Boolean(res.ai_evaluation);

          if (isCompleted && rawReport) {
            const parsedReport =
              typeof rawReport === "string" ? JSON.parse(rawReport) : rawReport;
            setReport(parsedReport);
            setTechnicalMetrics({
              posture_metric: res.posture_metric,
              eye_contact_metrics: res.eye_contact_metrics,
              voice_metrics: res.voice_metrics,
              qna_metrics: parsedReport,
            });
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

        {technicalMetrics && (
          <HrResults metrics={technicalMetrics} reportTitle="Technical Behavior Analysis" />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
  {report.per_question_feedback.map((q, idx) => (
    <div key={idx} className="is-qa-card">
      <div className="is-qa-header">
        <p className="is-qa-question">
          Q{idx + 1}. {q.question}
        </p>
        <span className="is-verdict-badge" style={verdictStyle(q.verdict)}>
          {q.verdict}
        </span>
      </div>

      <p className="is-qa-feedback">{q.feedback}</p>

      {q.matched_keywords?.length > 0 && (
        <div className="is-kw-section">
          <div className="is-kw-heading">Key Concepts Covered</div>
          <div className="is-kw-row">
            {q.matched_keywords.map((k) => (
              <span key={k} className="is-kw-tag" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                ✓ {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {q.missed_keywords?.length > 0 && (
        <div className="is-kw-section">
          <div className="is-kw-heading">Key Concepts Missed</div>
          <div className="is-kw-row">
            {q.missed_keywords.map((k) => (
              <span key={k} className="is-kw-tag" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                ✗ {k}
              </span>
            ))}
          </div>
        </div>
      )}
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
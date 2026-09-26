import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { fetchReportData } from "../../utils/buildInterviewReport";
import InterviewReport from "./InterviewReport";
import "./InterviewSession.css";

export default function InterviewResults() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, roundType, role: navRole, completedAt } = location.state || {};

  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const report = await fetchReportData({
          sessionId,
          roundType: roundType === "hr" ? "hr" : "technical",
          getToken,
          role: navRole,
          completedAt,
          clerkFullName: clerkUser?.fullName,
        });
        if (!report) {
          setError("Results are not fully evaluated yet.");
        } else {
          setReportData(report);
        }
      } catch (err) {
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (error || !reportData) {
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

  return (
    <div className="is-page" style={{ padding: "24px 20px 40px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto 16px" }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            padding: "6px 4px",
            fontSize: 14,
            fontWeight: 600,
            color: "#2554c7",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <InterviewReport report={reportData} />

      <div style={{ maxWidth: 880, margin: "16px auto 0" }}>
        <button className="is-btn-primary" onClick={() => navigate("/interview")} style={{ width: "100%" }}>
          Start New Interview
        </button>
      </div>
    </div>
  );
}
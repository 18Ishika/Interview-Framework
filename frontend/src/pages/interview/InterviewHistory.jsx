import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getInterviewHistory } from "../../api/interviewApi";
import { fetchReportData } from "../../utils/buildInterviewReport";
import { downloadReportAsPdf } from "../../utils/exportReportPdf";
import ReportPreviewModal from "../../components/report/ReportPreviewModal";
import InterviewReport from "./InterviewReport";
import "./InterviewSession.css";

const HIDDEN_PDF_ROOT_ID = "pdf-export-hidden-root";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0-4-4m4 4 4-4M4 19.5h16" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ animation: "ir-spin 0.8s linear infinite" }}>
      <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
      <style>{"@keyframes ir-spin { to { transform: rotate(360deg); } }"}</style>
    </svg>
  );
}

const iconBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  padding: 0,
  borderRadius: 6,
  color: "#2554c7",
  background: "#eef3fe",
  border: "1px solid #c7d5f5",
};

export default function InterviewHistory() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { sessionId, roundType, role } | null
  const [downloadingKey, setDownloadingKey] = useState(null); // `${sessionId}:${roundType}` | null
  const [hiddenReport, setHiddenReport] = useState(null);

  useEffect(() => {
    let timer;
    async function fetchHistory() {
      try {
        const res = await getInterviewHistory(getToken);
        const list = res.history || [];
        setHistory(list);

        const hasEvaluating = list.some(item => item.tech_status === "evaluating" || item.hr_status === "evaluating");
        if (hasEvaluating) {
          timer = setTimeout(fetchHistory, 5000);
        }
      } catch (err) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
    return () => clearTimeout(timer);
  }, [getToken]);

  async function handleDownload(item, roundType) {
    const key = `${item.session_id}:${roundType}`;
    setDownloadingKey(key);
    try {
      const data = await fetchReportData({
        sessionId: item.session_id,
        roundType,
        getToken,
        role: item.target_role,
        clerkFullName: clerkUser?.fullName,
      });
      if (!data) {
        alert("This round isn't fully evaluated yet.");
        return;
      }
      setHiddenReport(data);
      // Let the hidden container actually paint before capturing it.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const name = data?.candidate?.name ? `${data.candidate.name}-` : "";
      await downloadReportAsPdf(HIDDEN_PDF_ROOT_ID, `${name}${roundType}-interview-report.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Couldn't generate the PDF — check the console for details.");
    } finally {
      setHiddenReport(null);
      setDownloadingKey(null);
    }
  }

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
          {history.map((item) => {
            const techKey = `${item.session_id}:technical`;
            const hrKey = `${item.session_id}:hr`;
            return (
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
                  flexWrap: "wrap",
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

                {/* Only completed rounds get any icons — evaluating/pending
                    rounds render nothing here, on purpose. */}
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {item.tech_status === "completed" && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280", marginRight: 2 }}>Technical</span>
                      <button
                        className="is-btn-ghost"
                        title="Preview report"
                        style={iconBtnStyle}
                        onClick={() =>
                          setPreview({ sessionId: item.session_id, roundType: "technical", role: item.target_role })
                        }
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className="is-btn-ghost"
                        title="Download PDF"
                        style={iconBtnStyle}
                        disabled={downloadingKey === techKey}
                        onClick={() => handleDownload(item, "technical")}
                      >
                        {downloadingKey === techKey ? <SpinnerIcon /> : <DownloadIcon />}
                      </button>
                    </div>
                  )}

                  {item.hr_status === "completed" && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280", marginRight: 2 }}>HR</span>
                      <button
                        className="is-btn-ghost"
                        title="Preview report"
                        style={iconBtnStyle}
                        onClick={() =>
                          setPreview({ sessionId: item.session_id, roundType: "hr", role: item.target_role })
                        }
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className="is-btn-ghost"
                        title="Download PDF"
                        style={iconBtnStyle}
                        disabled={downloadingKey === hrKey}
                        onClick={() => handleDownload(item, "hr")}
                      >
                        {downloadingKey === hrKey ? <SpinnerIcon /> : <DownloadIcon />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="is-btn-primary"
          style={{ marginTop: 24, width: "100%" }}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      {preview && (
        <ReportPreviewModal
          sessionId={preview.sessionId}
          roundType={preview.roundType}
          role={preview.role}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Off-screen render target for one-click PDF export — never visible,
          just needs to actually paint so html2canvas can capture it. */}
      <div style={{ position: "fixed", top: 0, left: "-10000px", width: 880 }}>
        {hiddenReport && <InterviewReport report={hiddenReport} rootId={HIDDEN_PDF_ROOT_ID} />}
      </div>
    </div>
  );
}
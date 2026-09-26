import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { fetchReportData } from "../../utils/buildInterviewReport";
import InterviewReport from "../../pages/interview/InterviewReport";

/**
 * Modal preview of a past report, opened from the history list's eye
 * button. Fetches on open (not eagerly for every row).
 *
 * props: sessionId, roundType ("technical" | "hr"), role?, onClose
 */
export default function ReportPreviewModal({ sessionId, roundType, role, onClose }) {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchReportData({
          sessionId,
          roundType,
          getToken,
          role,
          clerkFullName: clerkUser?.fullName,
        });
        if (cancelled) return;
        if (!data) {
          setError("This round isn't fully evaluated yet.");
        } else {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, roundType, getToken]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11, 15, 25, 0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        padding: "32px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f6f8fb",
          borderRadius: 12,
          width: "100%",
          maxWidth: 940,
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            justifyContent: "flex-end",
            padding: "12px 16px",
            background: "#f6f8fb",
            borderBottom: "1px solid #e2e7ef",
          }}
        >
          <button
            onClick={onClose}
            className="is-btn-ghost"
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: "8px 0 24px" }}>
          {loading && (
            <p style={{ textAlign: "center", color: "#5b6472", padding: "40px 0" }}>
              Loading report…
            </p>
          )}
          {error && (
            <p style={{ textAlign: "center", color: "#5b6472", padding: "40px 0" }}>{error}</p>
          )}
          {report && <InterviewReport report={report} />}
        </div>
      </div>
    </div>
  );
}
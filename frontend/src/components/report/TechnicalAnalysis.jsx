import React from "react";
import CommunicationAnalysis from "./CommunicationAnalysis";

/**
 * data: {
 *   averageScore?: number,
 *   role?: string,                 // target_role selected when the interview was started
 *   dateLabel?: string,             // pre-formatted "Sep 25, 2026 · 10:32 AM"
 *   questions: [{
 *     question: string,
 *     verdict: "Strong Answer" | "Good Attempt" | "Needs Work",
 *     feedback: string,
 *     matched_keywords?: string[],
 *     missed_keywords?: string[],
 *   }],
 *   communication?: { visualConfidenceScore, posture, eyeContact, voice }
 * }
 */
function verdictBadgeClass(verdict) {
  if (verdict === "Strong Answer") return "ir-badge--strong";
  if (verdict === "Good Attempt") return "ir-badge--partial";
  return "ir-badge--weak";
}

export default function TechnicalAnalysis({ data }) {
  const questions = data?.questions || [];
  if (questions.length === 0) return null;

  const metaLine = [data?.role && `Role: ${data.role}`, data?.dateLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="ir-card">
      <div className="ir-section-header">
        <div>
          <p className="ir-card__title">Technical Analysis</p>
          <p className="ir-card__subtitle" style={{ marginBottom: 0 }}>
            {questions.length} question{questions.length > 1 ? "s" : ""} evaluated
          </p>
          {metaLine && <p className="ir-round-meta">{metaLine}</p>}
        </div>
        {data?.averageScore != null && (
          <span className="ir-section-score">{data.averageScore.toFixed(1)}%</span>
        )}
      </div>

      <div>
        {questions.map((q, idx) => (
          <div className="ir-qa" key={idx}>
            <div className="ir-qa__head">
              <p className="ir-qa__question">
                Q{idx + 1}. {q.question}
              </p>
              {q.verdict && (
                <span className={`ir-badge ${verdictBadgeClass(q.verdict)}`}>
                  {q.verdict}
                </span>
              )}
            </div>

            {q.feedback && <p className="ir-qa__feedback">{q.feedback}</p>}

            {q.matched_keywords?.length > 0 && (
              <>
                <p className="ir-kw-label">Concepts covered</p>
                <div className="ir-tag-row">
                  {q.matched_keywords.map((k) => (
                    <span className="ir-tag ir-tag--hit" key={k}>
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}

            {q.missed_keywords?.length > 0 && (
              <>
                <p className="ir-kw-label">Concepts missed</p>
                <div className="ir-tag-row">
                  {q.missed_keywords.map((k) => (
                    <span className="ir-tag ir-tag--miss" key={k}>
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <CommunicationAnalysis data={data?.communication} title="Communication During Technical Round" />
    </div>
  );
}

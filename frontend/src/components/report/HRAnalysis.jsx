import React from "react";
import CommunicationAnalysis from "./CommunicationAnalysis";

/**
 * data: {
 *   averageScore?: number,
 *   cultureFitScore?: number,
 *   dateLabel?: string,            // pre-formatted "Sep 25, 2026 · 10:32 AM"
 *   questions?: [{ question: string, verdict?: string, feedback: string, matched_keywords?, missed_keywords? }],
 *   communication?: { visualConfidenceScore, posture, eyeContact, voice }
 * }
 */
function verdictBadgeClass(verdict) {
  if (verdict === "Strong Answer") return "ir-badge--strong";
  if (verdict === "Good Attempt") return "ir-badge--partial";
  return "ir-badge--weak";
}

export default function HRAnalysis({ data }) {
  const questions = data?.questions || [];
  const hasScore = data?.averageScore != null || data?.cultureFitScore != null;
  const hasCommunication = data?.communication != null;
  if (questions.length === 0 && !hasScore && !hasCommunication) return null;

  return (
    <div className="ir-card">
      <div className="ir-section-header">
        <div>
          <p className="ir-card__title">HR Analysis</p>
          <p className="ir-card__subtitle" style={{ marginBottom: 0 }}>
            Behavioral &amp; culture-fit evaluation
          </p>
          {data?.dateLabel && <p className="ir-round-meta">{data.dateLabel}</p>}
        </div>
        {data?.averageScore != null && (
          <span className="ir-section-score">{data.averageScore.toFixed(1)}%</span>
        )}
      </div>

      {data?.cultureFitScore != null && (
        <div style={{ marginBottom: questions.length ? 14 : 0 }}>
          <div className="ir-bar-row">
            <span className="ir-bar-row__label">HR &amp; Culture Fit</span>
            <span className="ir-bar-track">
              <span
                className="ir-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, data.cultureFitScore))}%` }}
              />
            </span>
            <span className="ir-bar-row__value">{Math.round(data.cultureFitScore)}%</span>
          </div>
        </div>
      )}

      {questions.length > 0 && (
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
      )}

      <CommunicationAnalysis data={data?.communication} title="Communication During HR Round" />
    </div>
  );
}

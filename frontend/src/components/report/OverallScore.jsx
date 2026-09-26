import React from "react";

/**
 * overall: {
 *   score: number,          // 0-100
 *   rating?: string,        // "Needs Improvement" | "Average" | "Good" | "Excellent"
 *   summary?: string,
 *   sectionScores?: [{ label: string, score: number }]  // only include rounds that exist
 * }
 */
export default function OverallScore({ overall }) {
  if (overall == null || overall.score == null) return null;

  return (
    <div className="ir-card">
      <div className="ir-header">
        <div>
          <p className="ir-card__title">Overall Score</p>
          {overall.rating && (
            <p className="ir-card__subtitle" style={{ marginBottom: 0 }}>
              {overall.rating}
            </p>
          )}
        </div>
        <div className="ir-score-circle">{Math.round(overall.score)}</div>
      </div>

      {overall.summary && (
        <p className="ir-qa__feedback" style={{ marginTop: 14 }}>
          {overall.summary}
        </p>
      )}

      {overall.sectionScores?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {overall.sectionScores.map((s) => (
            <div className="ir-bar-row" key={s.label}>
              <span className="ir-bar-row__label">{s.label}</span>
              <span className="ir-bar-track">
                <span
                  className="ir-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, s.score))}%` }}
                />
              </span>
              <span className="ir-bar-row__value">{Math.round(s.score)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

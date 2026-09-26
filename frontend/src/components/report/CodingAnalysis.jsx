import React from "react";

/**
 * data: {
 *   testCasePassRate?: string,   // "100% (16/16)"
 *   codeQuality?: string,        // "A - Production Grade"
 *   timeComplexity?: string,     // "Optimal O(N)"
 *   correctnessScore?: number,   // 0-100
 *   dateLabel?: string,          // pre-formatted "Sep 25, 2026 · 10:32 AM"
 *   questions?: [{
 *     title: string,
 *     tags?: string[],           // e.g. ["Distributed Cache", "Perfect Logic"]
 *     prompt?: string,
 *     excerpt?: string,          // short quoted snippet of the candidate's response
 *     summary?: string,
 *     score?: number,
 *   }]
 * }
 */
export default function CodingAnalysis({ data }) {
  const stats = [
    { label: "Test Case Pass Rate", value: data?.testCasePassRate },
    { label: "Code Quality", value: data?.codeQuality },
    { label: "Time Complexity", value: data?.timeComplexity },
    {
      label: "Correctness",
      value: data?.correctnessScore != null ? `${Math.round(data.correctnessScore)}/100` : undefined,
    },
  ].filter((s) => s.value);

  const questions = data?.questions || [];
  if (stats.length === 0 && questions.length === 0) return null;

  return (
    <div className="ir-card">
      <p className="ir-card__title">Coding Analysis</p>
      <p className="ir-card__subtitle" style={{ marginBottom: data?.dateLabel ? 4 : 16 }}>
        Code soundness, complexity and problem-solving execution
      </p>
      {data?.dateLabel && <p className="ir-round-meta" style={{ marginBottom: 16 }}>{data.dateLabel}</p>}

      {stats.length > 0 && (
        <div className="ir-stat-grid">
          {stats.map((s) => (
            <div className="ir-stat" key={s.label}>
              <p className="ir-stat__label">{s.label}</p>
              <p className="ir-stat__value">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {questions.map((q, idx) => (
        <div className="ir-qa" key={idx}>
          <div className="ir-qa__head">
            <div>
              <p className="ir-qa__question">
                {idx + 1}. {q.title}
              </p>
              {q.tags?.length > 0 && (
                <div className="ir-tag-row" style={{ marginTop: 6 }}>
                  {q.tags.map((t) => (
                    <span className="ir-tag ir-tag--hit" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {q.score != null && (
              <span className="ir-badge ir-badge--strong">{q.score}/100</span>
            )}
          </div>

          {q.prompt && <p className="ir-qa__feedback" style={{ marginTop: 8 }}>{q.prompt}</p>}

          {q.excerpt && (
            <p
              className="ir-qa__feedback"
              style={{
                background: "var(--ir-surface)",
                border: "1px solid var(--ir-border)",
                borderRadius: 6,
                padding: "8px 10px",
                fontStyle: "italic",
              }}
            >
              &ldquo;{q.excerpt}&rdquo;
            </p>
          )}

          {q.summary && <p className="ir-qa__feedback">{q.summary}</p>}
        </div>
      ))}
    </div>
  );
}

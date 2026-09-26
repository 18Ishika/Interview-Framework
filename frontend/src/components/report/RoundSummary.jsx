import React from "react";

/**
 * rounds: [{ title: string, score?: number, note?: string }]
 * summary?: string   // executive summary shown under the "Round Summary" title
 * Only pass the rounds that actually happened — nothing is inferred here.
 */
export default function RoundSummary({ rounds, summary }) {
  const items = (rounds || []).filter((r) => r?.title);
  if (items.length === 0 && !summary) return null;

  return (
    <div className="ir-card">
      <p className="ir-card__title" style={{ marginBottom: summary ? 6 : 14 }}>
        Round Summary
      </p>
      {summary && (
        <p className="ir-qa__feedback" style={{ marginBottom: 16 }}>
          {summary}
        </p>
      )}
      {items.length > 0 && (
        <div className="ir-round-grid">
          {items.map((r) => (
            <div className="ir-round-card" key={r.title}>
              <p className="ir-round-card__title">{r.title}</p>
              {r.score != null && (
                <span className="ir-round-card__score">{Math.round(r.score)}</span>
              )}
              {r.note && <p className="ir-round-card__note">{r.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
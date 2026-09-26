import React from "react";

const ICONS = {
  Posture: (
    <svg className="ir-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="5" r="2.6" />
      <path strokeLinecap="round" d="M12 8.5v6.5M12 15l-3.5 6M12 15l3.5 6M8.5 11h7" />
    </svg>
  ),
  "Eye Contact": (
    <svg className="ir-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  Voice: (
    <svg className="ir-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path strokeLinecap="round" d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  ),
};

/**
 * Embeddable behavior/communication block — NOT a standalone round. Render
 * this inside TechnicalAnalysis / HRAnalysis (or any round) right after
 * that round's Q&A, since communication is analysis that runs alongside a
 * round rather than a round of its own.
 *
 * data: {
 *   visualConfidenceScore?: number,     // 0-100
 *   posture?: { score: number, note?: string },
 *   eyeContact?: {
 *     score: number,
 *     note?: string,
 *     blinksPerMin?: number,
 *     blinkLevel?: string,               // "low" | "normal" | "high"
 *     facingCameraPercent?: number,
 *   },
 *   voice?: { score: number, note?: string },
 * }
 * title?: string   // defaults to "Communication During This Round"
 */
export default function CommunicationAnalysis({ data, title = "Communication During This Round" }) {
  const metrics = [];

  if (data?.posture?.score != null) {
    metrics.push({
      label: "Posture",
      value: data.posture.score,
      detail: data.posture.note,
    });
  }
  if (data?.eyeContact?.score != null) {
    const parts = [];
    if (data.eyeContact.blinksPerMin != null) {
      parts.push(
        `${data.eyeContact.blinksPerMin} blinks/min${
          data.eyeContact.blinkLevel ? ` · ${data.eyeContact.blinkLevel}` : ""
        }`
      );
    }
    if (data.eyeContact.facingCameraPercent != null) {
      parts.push(`Facing camera ${data.eyeContact.facingCameraPercent}% of the time`);
    }
    metrics.push({
      label: "Eye Contact",
      value: data.eyeContact.score,
      detail: [data.eyeContact.note, ...parts].filter(Boolean).join(" · "),
    });
  }
  if (data?.voice?.score != null) {
    metrics.push({
      label: "Voice",
      value: data.voice.score,
      detail: data.voice.note,
    });
  }

  if (metrics.length === 0 && data?.visualConfidenceScore == null) return null;

  return (
    <div>
      <hr className="ir-divider" />
      <div className="ir-section-header" style={{ marginBottom: metrics.length ? 12 : 0 }}>
        <p className="ir-subsection-title" style={{ marginBottom: 0 }}>
          {title}
        </p>
        {data?.visualConfidenceScore != null && (
          <span className="ir-section-score">{data.visualConfidenceScore.toFixed(1)}</span>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="ir-metric-grid">
          {metrics.map((m) => (
            <div className="ir-metric" key={m.label}>
              <p className="ir-metric__label">
                {ICONS[m.label]}
                {m.label}
              </p>
              <p className="ir-metric__value">{m.value}</p>
              {m.detail && <p className="ir-metric__detail">{m.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
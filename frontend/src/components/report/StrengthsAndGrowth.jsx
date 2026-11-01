import React from "react";

/**
 * feedback: {
 *   strengths?: string[],      // what the candidate did well
 *   improvements?: string[],   // where they fell short
 *   actionPlan?: string[],     // concrete next steps to act on
 * }
 *
 * Render this LAST in the report, after all round analysis cards.
 * Uses only classes that already exist in ReportTheme.css.
 */
export default function StrengthsAndGrowth({ feedback }) {
  const strengths = (feedback?.strengths || []).filter(Boolean);
  const improvements = (feedback?.improvements || []).filter(Boolean);
  const actionPlan = (feedback?.actionPlan || []).filter(Boolean);

  if (!strengths.length && !improvements.length && !actionPlan.length) return null;

  return (
    <div className="ir-card">
      <p className="ir-card__title">Strengths &amp; Areas for Improvement</p>
      <p className="ir-card__subtitle">
        What the candidate did well and where to focus next
      </p>

      <div className="ir-two-col">
        <div>
          <p className="ir-subsection-title">What went well</p>
          {strengths.length > 0 ? (
            <ul className="ir-bullet-list">
              {strengths.map((s, i) => (
                <li key={i}>
                  <span className="ir-bullet-dot" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ir-qa__feedback">
              No clear strengths were demonstrated in the evaluated round.
            </p>
          )}
        </div>

        <div>
          <p className="ir-subsection-title">Needs improvement</p>
          {improvements.length > 0 ? (
            <ul className="ir-bullet-list">
              {improvements.map((s, i) => (
                <li key={i}>
                  <span className="ir-bullet-dot ir-bullet-dot--muted" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ir-qa__feedback">No major gaps identified.</p>
          )}
        </div>
      </div>

      {actionPlan.length > 0 && (
        <>
          <hr className="ir-divider" />
          <p className="ir-subsection-title">Recommended next steps</p>
          <ul className="ir-bullet-list">
            {actionPlan.map((s, i) => (
              <li key={i}>
                <span className="ir-bullet-dot" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
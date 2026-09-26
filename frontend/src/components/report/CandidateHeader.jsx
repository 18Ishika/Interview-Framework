import React from "react";

/**
 * candidate: {
 *   name: string,
 *   role?: string,
 *   avatarUrl?: string,
 *   appliedDate?: string,
 *   interviewType?: string,
 * }
 * reportMeta?: { reportId?: string, status?: string }
 * recommendation?: { label: string }   // e.g. "Strong Hire", "Needs Improvement"
 */
export default function CandidateHeader({ candidate, reportMeta, recommendation }) {
  if (!candidate?.name && !candidate?.avatarUrl) return null;

  const displayName = candidate.name || "Candidate";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const metaLine = [candidate.appliedDate, candidate.interviewType]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="ir-card ir-card--header">
      {reportMeta?.reportId && (
        <div className="ir-header__id">
          <span>Report ID: <b>{reportMeta.reportId}</b></span>
          {reportMeta.status && <span>· {reportMeta.status}</span>}
        </div>
      )}

      <div className="ir-header">
        <div className="ir-person">
          <div className="ir-avatar">
            {candidate.avatarUrl ? (
              <img src={candidate.avatarUrl} alt={displayName} />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="ir-person__name">{displayName}</p>
            {candidate.role && <p className="ir-person__role">{candidate.role}</p>}
            {metaLine && <p className="ir-person__meta">{metaLine}</p>}
          </div>
        </div>

        {recommendation?.label && (
          <div className="ir-header__right">
            <p className="ir-header__right-label">Recommendation</p>
            <span className="ir-badge ir-badge--strong">{recommendation.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
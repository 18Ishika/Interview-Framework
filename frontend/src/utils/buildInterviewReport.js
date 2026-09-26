import {
  getResults,
  getHrResults,
  getTechnicalResultsBySession,
  getProfileDetails,
  getFullReport,
} from "../api/interviewApi";

// Profile.jsx caches its response in sessionStorage under this key — reuse
// it if it's there so we don't fire a second network call when the user
// has already opened their profile this session. acknowledgeResult()
// already clears this key when it goes stale.
async function fetchProfileDetails(getToken) {
  const cached = sessionStorage.getItem("cached_profile_details");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to a live fetch if the cached value is malformed
    }
  }
  return getProfileDetails(getToken);
}

function formatDateTime(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Your backend's ai_evaluation / qna_metrics never actually include a
// numeric average_score or overall_score — only overall_rating and a
// verdict per question. Without SOME number, OverallScore renders nothing
// at all (no score circle) and every per-round percentage stays blank,
// which is most of why the report looks flat. This derives a reasonable
// estimate from the verdicts so those elements actually render; it's used
// only as a fallback when the backend doesn't supply a real score.
const VERDICT_SCORE = { "Strong Answer": 92, "Good Attempt": 65, "Needs Work": 32 };
function estimateScoreFromQuestions(questions) {
  if (!questions?.length) return undefined;
  const scored = questions
    .map((q) => VERDICT_SCORE[q.verdict])
    .filter((s) => s != null);
  if (!scored.length) return undefined;
  return Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10;
}

function buildCommunication({ posture, eye, voice }) {
  if (!posture && !eye && !voice) return undefined;
  return {
    posture: posture && { score: posture.score, note: posture.note },
    eyeContact: eye && {
      score: eye.score,
      note: eye.note,
      blinksPerMin: eye.blinks_per_min,
      blinkLevel: eye.blink_level,
      facingCameraPercent: eye.facing_camera_percent,
    },
    voice: voice && { score: voice.score, note: voice.note },
  };
  // NOTE: field names inside posture_metric / eye_contact_metrics /
  // voice_metrics are a best guess from the labels shown in the UI —
  // adjust the right-hand side paths if your backend's keys differ.
}

function buildTechnicalReport({ report, technicalMetrics, candidate, role, dateLabel }) {
  const questions = (report.per_question_feedback || []).map((q) => ({
    question: q.question,
    verdict: q.verdict,
    feedback: q.feedback,
    matched_keywords: q.matched_keywords,
    missed_keywords: q.missed_keywords,
  }));
  const averageScore = report.average_score ?? estimateScoreFromQuestions(questions);

  return {
    candidate,
    overall: {
      score: report.overall_score ?? averageScore,
      rating: report.overall_rating,
      summary: report.overall_summary,
    },
    rounds: {
      technical: {
        role,
        dateLabel,
        averageScore,
        questions,
        communication: buildCommunication({
          posture: technicalMetrics?.posture_metric,
          eye: technicalMetrics?.eye_contact_metrics,
          voice: technicalMetrics?.voice_metrics,
        }),
      },
    },
  };
}

function buildHrReport({ hrReport, hrMetrics, candidate, dateLabel }) {
  const questions = (hrReport?.per_question_feedback || []).map((q) => ({
    question: q.question,
    verdict: q.verdict,
    feedback: q.feedback,
    matched_keywords: q.matched_keywords,
    missed_keywords: q.missed_keywords,
  }));
  const averageScore = hrReport?.average_score ?? estimateScoreFromQuestions(questions);

  return {
    candidate,
    overall: {
      score: hrReport?.overall_score ?? averageScore,
      rating: hrReport?.overall_rating,
      summary: hrReport?.overall_summary,
    },
    rounds: {
      hr: {
        dateLabel,
        averageScore,
        cultureFitScore: hrReport?.culture_fit_score,
        questions,
        communication: buildCommunication({
          posture: hrMetrics?.posture_metric,
          eye: hrMetrics?.eye_contact_metrics,
          voice: hrMetrics?.voice_metrics,
        }),
      },
    },
  };
}

// AI-generated executive summary (spans whichever rounds are done) —
// overrides the per-round `overall.summary` shown in RoundSummary. Safe
// no-op if the full-report fetch failed or only one round exists so far.
function mergeFullReport(report, fullReportRes) {
  if (!fullReportRes || fullReportRes.status !== "completed") return report;
  return {
    ...report,
    overall: {
      ...report.overall,
      summary: fullReportRes.overall_summary || report.overall.summary,
    },
  };
}

/**
 * fetchReportData
 * ----------------
 * The single place that turns { sessionId, roundType } into the `report`
 * shape InterviewReport.jsx expects. Used by both the results page (current
 * session) and the history page (previewing/exporting a past session).
 *
 * options:
 *   sessionId, roundType: "technical" | "hr"
 *   getToken: Clerk's getToken
 *   role?: pre-known target_role (e.g. from a history list item) — used
 *     as a fallback if the results endpoint doesn't return target_role
 *   completedAt?: fallback date if the backend doesn't return a timestamp
 *   clerkFullName?: fallback candidate name if the profile has none
 *
 * Returns `null` if the round isn't evaluated yet (caller should show an
 * "evaluating" / empty state rather than throwing).
 */
export async function fetchReportData({ sessionId, roundType, getToken, role, completedAt, clerkFullName }) {
  const profileRes = await fetchProfileDetails(getToken).catch((err) => {
    console.warn("Profile fetch failed:", err);
    return null;
  });

  const candidate = {
    name:
      [profileRes?.user?.first_name, profileRes?.user?.last_name]
        .filter(Boolean)
        .join(" ") || clerkFullName || undefined,
    avatarUrl: profileRes?.user?.profile_img_url,
  };

  const fullReportRes = sessionId
    ? await getFullReport(sessionId, getToken).catch((err) => {
        console.warn("Full report fetch failed:", err);
        return null;
      })
    : null;

  if (roundType === "hr") {
    if (!sessionId) throw new Error("Missing session id for HR results");
    const res = await getHrResults(sessionId, getToken);
    if (res.hr_status !== "completed") return null;

    const rawReport = res.report ?? res.qna_metrics;
    const parsedReport = typeof rawReport === "string" ? JSON.parse(rawReport) : rawReport;
    const report = buildHrReport({
      hrReport: parsedReport,
      hrMetrics: {
        posture_metric: res.posture_metric,
        eye_contact_metrics: res.eye_contact_metrics,
      },
      candidate,
      dateLabel: formatDateTime(res.submitted_at || res.started_at || completedAt),
    });
    return mergeFullReport(report, fullReportRes);
  }

  const res = sessionId
    ? await getTechnicalResultsBySession(sessionId, getToken)
    : await getResults(getToken);

  const rawReport = res.report ?? res.ai_evaluation;
  const isCompleted = res.status === "completed" || Boolean(res.ai_evaluation);
  if (!isCompleted || !rawReport) return null;

  const parsedReport = typeof rawReport === "string" ? JSON.parse(rawReport) : rawReport;
  const report = buildTechnicalReport({
    report: parsedReport,
    technicalMetrics: {
      posture_metric: res.posture_metric,
      eye_contact_metrics: res.eye_contact_metrics,
      voice_metrics: res.voice_metrics,
    },
    candidate,
    role: res.target_role || role,
    dateLabel: formatDateTime(res.submitted_at || res.started_at || completedAt),
  });
  return mergeFullReport(report, fullReportRes);
}
import React from "react";
import CandidateHeader from "../../components/report/CandidateHeader";
import OverallScore from "../../components/report/OverallScore";
import RoundSummary from "../../components/report/RoundSummary";
import TechnicalAnalysis from "../../components/report/TechnicalAnalysis";
import CodingAnalysis from "../../components/report/CodingAnalysis";
import HRAnalysis from "../../components/report/HRAnalysis";
import "../../components/report/ReportTheme.css";

/**
 * InterviewReport
 * ----------------
 * Renders a full interview report from a single `report` object. Only the
 * rounds that actually happened need to be passed — the matching card just
 * won't render otherwise.
 *
 * Communication (posture/eye contact/voice) is NOT its own round — it's
 * analysis that ran alongside Technical and HR, so it's nested under each
 * of those (`rounds.technical.communication`, `rounds.hr.communication`)
 * and rendered inside that round's own card, not as a separate section.
 *
 * Expected shape:
 * {
 *   candidate: { name, role, avatarUrl },
 *   reportMeta: { reportId, status },
 *   overall: { score, rating, summary, sectionScores: [{ label, score }] },
 *   recommendation: { label },
 *   rounds: {
 *     technical: { role, dateLabel, averageScore, questions: [...], communication: {...} },
 *     hr:        { dateLabel, averageScore, cultureFitScore, questions: [...], communication: {...} },
 *     coding:    { dateLabel, testCasePassRate, codeQuality, timeComplexity, correctnessScore, questions: [...] },
 *   },
 *   recommendations: { recommendation, summary, strengths, growthAreas },
 * }
 *
 * For a PDF export later: wrap the returned tree in a container with a
 * fixed id (e.g. `#interview-report-root`) and pass it to your PDF tool
 * of choice (html2canvas + jsPDF, or react-to-print). The print styles in
 * ReportTheme.css already flatten shadows and avoid card page-breaks.
 */
export default function InterviewReport({ report, rootId = "interview-report-root" }) {
  if (!report) return null;

  const rounds = report.rounds || {};

  const roundSummaryItems = [
    rounds.technical && {
      title: "Technical",
      score: rounds.technical.averageScore,
      note: rounds.technical.dateLabel,
    },
    rounds.coding && {
      title: "Coding",
      score: rounds.coding.correctnessScore,
      note: rounds.coding.testCasePassRate || rounds.coding.dateLabel,
    },
    rounds.hr && {
      title: "HR",
      score: rounds.hr.averageScore ?? rounds.hr.cultureFitScore,
      note: rounds.hr.dateLabel,
    },
  ].filter(Boolean);

  return (
    <div className="ir-report" id={rootId}>
      <div className="ir-stack">
        <CandidateHeader
          candidate={report.candidate}
          reportMeta={report.reportMeta}
          recommendation={report.recommendation}
        />

        <OverallScore overall={report.overall} />

        <RoundSummary rounds={roundSummaryItems} summary={report.overall?.summary} />

        {rounds.coding && <CodingAnalysis data={rounds.coding} />}
        {rounds.technical && <TechnicalAnalysis data={rounds.technical} />}
        {rounds.hr && <HRAnalysis data={rounds.hr} />}

        {report.recommendations && <Recommendations data={report.recommendations} />}
      </div>
    </div>
  );
}
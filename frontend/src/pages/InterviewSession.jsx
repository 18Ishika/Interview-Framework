import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { startInterview, evaluateAnswer, getResults, fetchQuestionAudio } from "../api/interviewApi";
import "./InterviewSession.css";

function QuestionPanel({ question, onSubmit, loading, audioUrl, onExit }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setAudioBlob(null);
      setAudioURL(null);
    } catch {
      alert("Microphone access denied. Please allow mic access and try again.");
    }
  };

  const stopRec = () => { recorderRef.current?.stop(); setRecording(false); };
  const pct = Math.round((question.question_number / question.total_questions) * 100);

  return (
    <div className="is-panel">
      <div className="is-progress-wrap">
        <div className="is-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="is-progress-label">Question {question.question_number} of {question.total_questions}</p>
      <div className="is-badge">{question.topic} · {question.concept}</div>
      <div className="is-question-box">
        <p className="is-question-text">{question.question}</p>
      </div>
      <div className="is-question-actions">
        <button className="is-btn-ghost" onClick={() => audioUrl && new Audio(audioUrl).play()}>
          🔊 Replay Question
        </button>
        <button className="is-btn-danger" onClick={onExit}>
          ✕ Exit Interview
        </button>
      </div>
      <div className="is-recorder">
        {!audioBlob && !recording && (
          <button className="is-btn-record" onClick={startRec}>🎙 Start Recording</button>
        )}
        {recording && (
          <>
            <div className="is-rec-indicator"><span className="is-dot" /> Recording…</div>
            <button className="is-btn-stop" onClick={stopRec}>⏹ Stop</button>
          </>
        )}
        {audioBlob && (
          <div className="is-audio-review">
            <audio controls src={audioURL} style={{ width: "100%" }} />
            <div className="is-audio-actions">
              <button className="is-btn-ghost" onClick={() => { setAudioBlob(null); setAudioURL(null); }}>Re-record</button>
              <button className="is-btn-primary" style={{ opacity: loading ? 0.5 : 1 }} onClick={() => onSubmit(audioBlob)} disabled={loading}>
                {loading ? "Evaluating…" : "Submit Answer →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function ResultsSummary({ report, onRestart }) {
  if (!report) return null;

  const ratingColor = {
    Excellent: "#16a34a",
    Good: "#22c55e",
    Average: "#d97706",
    "Needs Improvement": "#dc2626",
  }[report.overall_rating] || "var(--color-primary-dark)";

  const verdictStyle = (verdict) => ({
    background: verdict === "Strong Answer" ? "#f0fdf4" : verdict === "Good Attempt" ? "#fffbeb" : "#fef2f2",
    color: verdict === "Strong Answer" ? "#16a34a" : verdict === "Good Attempt" ? "#d97706" : "#dc2626",
  });

  return (
    <div className="is-panel">
      <h2 className="is-heading" style={{ textAlign: "center", marginBottom: 8 }}>Interview Complete 🎉</h2>

      <div className="is-overview-row">
        <div className="is-overview-card">
          <span style={{ fontSize: 22, fontWeight: 700, color: ratingColor }}>{report.overall_rating}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Overall Rating</span>
        </div>
      </div>

      <div className="is-transcript" style={{ marginBottom: 24 }}>
        <p className="is-transcript-label">Summary</p>
        <p className="is-transcript-text">{report.overall_summary}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {report.per_question_feedback?.map((q, i) => (
          <div key={i} className="is-result-item">
            <div className="is-result-header">
              <span className="is-result-num">Q{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-secondary)" }}>{q.question}</span>
              <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 99, ...verdictStyle(q.verdict) }}>
                {q.verdict}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-primary)", marginTop: 6, marginBottom: 8 }}>{q.feedback}</p>

            {q.matched_keywords?.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 6 }}>Got:</span>
                {q.matched_keywords.map((k) => (
                  <span key={k} className="is-kw-tag" style={{ background: "#f0fdf4", color: "#16a34a", marginRight: 4 }}>{k}</span>
                ))}
              </div>
            )}
            {q.missed_keywords?.length > 0 && (
              <div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 6 }}>Missed:</span>
                {q.missed_keywords.map((k) => (
                  <span key={k} className="is-kw-tag" style={{ background: "#fef2f2", color: "#ef4444", marginRight: 4 }}>{k}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="is-btn-primary" onClick={onRestart}>Start New Interview</button>
    </div>
  );
}
export default function InterviewSession() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState(location.state?.role ? "loading" : "redirecting");
  const [question, setQuestion] = useState(null);
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);
  const [report, setReport] = useState(null);
  const [rawResults, setRawResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const playQuestionAudio = async () => {
    try {
      const url = await fetchQuestionAudio(getToken);
      setQuestionAudioUrl(url);
      new Audio(url).play();
    } catch (e) { console.error("Audio fetch failed", e); }
  };

  const handleStart = async (role) => {
    setLoading(true); setError(null);
    try {
      const q = await startInterview(role, getToken);
      setQuestion(q);
      setPhase("question");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
    playQuestionAudio();
  };

  useEffect(() => {
    const role = location.state?.role;
    if (role) {
      handleStart(role);
    } else {
      navigate('/interview/setup', { replace: true });
    }
  }, []); // eslint-disable-line

  const handleSubmit = async (audioBlob) => {
    setLoading(true); setError(null);
    try {
      const data = await evaluateAnswer(audioBlob, getToken);
      if (data.next_question?.round_complete) {
        const res = await getResults(getToken);
        setReport(res.report);
        setRawResults(res.raw_results || []);
        setPhase("results");
      } else {
        setQuestion(data.next_question);
        playQuestionAudio();
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleRestart = () => { navigate('/interview/setup'); };

  return (
    <div className="is-page">
      {error && (
        <div className="is-error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="is-error-close">✕</button>
        </div>
      )}
      {(phase === "loading" || phase === "redirecting") && (
        <div className="is-centered">
          <h2 className="is-heading">Starting your interview…</h2>
          <p className="is-sub">Setting things up, this'll just take a moment.</p>
        </div>
      )}
      {phase === "question" && question && (
      <QuestionPanel
        key={question.question_number}
        question={question}
        onSubmit={handleSubmit}
        loading={loading}
        audioUrl={questionAudioUrl}
        onExit={() => navigate('/interview')}
      />
    )}
      {phase === "results" && <ResultsSummary report={report} rawResults={rawResults} onRestart={handleRestart} />}
    </div>
  );
}
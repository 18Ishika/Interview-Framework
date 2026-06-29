import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { startInterview, evaluateAnswer, getResults, fetchQuestionAudio } from "../api/interviewApi";
import "./InterviewSession.css";

const ROLES = [
  "Backend Developer (Fresher)",
  "Frontend Developer (Fresher)",
  "Data Scientist (Fresher)",
  "Software Developer (Fresher)",
  "DevOps Engineer (Fresher)",
];

function RoleSelect({ onStart, loading }) {
  return (
    <div className="is-centered">
      <h2 className="is-heading">Choose your role</h2>
      <p className="is-sub">Pick the role you want to be interviewed for.</p>
      <div className="is-role-grid">
        {ROLES.map((role) => (
          <button key={role} className="is-role-card" onClick={() => onStart(role)} disabled={loading}>
            {loading ? "Starting…" : role}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionPanel({ question, onSubmit, loading, audioUrl, onExit })  {
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

function ScoreCard({ result, onNext }) {
  const pct = Math.round(result.final_score * 100);
  const color = result.label === "Correct" ? "#22c55e" : result.label === "Partial" ? "#f59e0b" : "#ef4444";

  return (
    <div className="is-panel">
      <div className="is-score-circle-wrap">
        <div className="is-score-circle" style={{ borderColor: color }}>
          <span style={{ fontSize: 28, fontWeight: 700, color }}>{pct}%</span>
          <span style={{ fontSize: 13, color, marginTop: 2 }}>{result.label}</span>
        </div>
      </div>
      <div className="is-breakdown">
        {[["Semantic Match", result.semantic_score], ["Keyword Coverage", result.keyword_coverage], ["Length", result.length_penalty]].map(([label, val]) => (
          <div key={label} className="is-score-row">
            <span className="is-score-label">{label}</span>
            <div className="is-bar-wrap"><div className="is-bar-fill" style={{ width: `${Math.round(val * 100)}%` }} /></div>
            <span className="is-score-pct">{Math.round(val * 100)}%</span>
          </div>
        ))}
      </div>
      {result.transcript && (
        <div className="is-transcript">
          <p className="is-transcript-label">Your answer:</p>
          <p className="is-transcript-text">"{result.transcript}"</p>
        </div>
      )}
      {result.missed_keywords?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p className="is-kw-label">Keywords you missed:</p>
          <div className="is-kw-row">
            {result.missed_keywords.map((k) => <span key={k} className="is-kw-tag" style={{ background: "#fef2f2", color: "#ef4444" }}>{k}</span>)}
          </div>
        </div>
      )}
      {result.matched_keywords?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="is-kw-label">Keywords you got:</p>
          <div className="is-kw-row">
            {result.matched_keywords.map((k) => <span key={k} className="is-kw-tag" style={{ background: "#f0fdf4", color: "#16a34a" }}>{k}</span>)}
          </div>
        </div>
      )}
      <button className="is-btn-primary" onClick={onNext}>Next Question →</button>
    </div>
  );
}

function ResultsSummary({ results, onRestart }) {
  const avg = results.length ? Math.round((results.reduce((s, r) => s + r.final_score, 0) / results.length) * 100) : 0;
  const counts = results.reduce((a, r) => { a[r.label] = (a[r.label] || 0) + 1; return a; }, { Correct: 0, Partial: 0, Incorrect: 0 });

  return (
    <div className="is-panel">
      <h2 className="is-heading" style={{ textAlign: "center", marginBottom: 8 }}>Interview Complete 🎉</h2>
      <div className="is-overview-row">
        {[["Overall", `${avg}%`, "var(--color-primary-dark)"], ["Correct", counts.Correct, "#16a34a"], ["Partial", counts.Partial, "#d97706"], ["Incorrect", counts.Incorrect, "#dc2626"]].map(([label, val, color]) => (
          <div key={label} className="is-overview-card">
            <span style={{ fontSize: 26, fontWeight: 700, color }}>{val}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {results.map((r, i) => (
          <div key={i} className="is-result-item">
            <div className="is-result-header">
              <span className="is-result-num">Q{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-secondary)" }}>{r.topic} · {r.concept}</span>
              <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: r.label === "Correct" ? "#f0fdf4" : r.label === "Partial" ? "#fffbeb" : "#fef2f2", color: r.label === "Correct" ? "#16a34a" : r.label === "Partial" ? "#d97706" : "#dc2626" }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", minWidth: 36, textAlign: "right" }}>{Math.round(r.final_score * 100)}%</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-primary)", marginTop: 6, marginBottom: 0 }}>{r.question}</p>
            {r.transcript && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4, marginBottom: 0 }}>Your answer: "{r.transcript}"</p>}
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

  const [phase, setPhase] = useState("select");
  const [question, setQuestion] = useState(null);
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [results, setResults] = useState([]);
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
    if (role) handleStart(role);
  }, []); // eslint-disable-line

  const handleSubmit = async (audioBlob) => {
    setLoading(true); setError(null);
    try {
      const data = await evaluateAnswer(audioBlob, getToken);
      setLastResult(data.result);
      if (data.next_question?.round_complete) {
        const res = await getResults(getToken);
        setResults(res.results);
        setPhase("results");
      } else {
        setQuestion(data.next_question);
        setPhase("scoring");
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleNext = () => { setLastResult(null); setPhase("question"); playQuestionAudio(); };
  const handleRestart = () => { setPhase("select"); setQuestion(null); setLastResult(null); setResults([]); setError(null); };

  return (
    <div className="is-page">
      {error && (
        <div className="is-error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="is-error-close">✕</button>
        </div>
      )}
      {phase === "select" && <RoleSelect onStart={handleStart} loading={loading} />}
      {phase === "question" && question && <QuestionPanel question={question} onSubmit={handleSubmit} loading={loading} audioUrl={questionAudioUrl} onExit={() => navigate('/interview')} />}
      {phase === "scoring" && lastResult && <ScoreCard result={lastResult} onNext={handleNext} />}
      {phase === "results" && <ResultsSummary results={results} onRestart={handleRestart} />}
    </div>
  );
}
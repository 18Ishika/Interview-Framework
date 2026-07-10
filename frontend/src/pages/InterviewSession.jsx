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
// ResultsSummary has been moved to InterviewResults.jsx
export default function InterviewSession() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState(location.state?.role ? "loading" : "redirecting");
  const [question, setQuestion] = useState(null);
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);
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
        await getResults(getToken); // Trigger celery evaluation
        alert("Your interview is complete! You will get your results within 3-5 mins.");
        navigate('/dashboard');
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
    </div>
  );
}
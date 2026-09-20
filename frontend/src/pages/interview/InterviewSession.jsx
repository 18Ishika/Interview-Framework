import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { startInterview, evaluateAnswer, getResults, fetchQuestionAudio } from "../../api/interviewApi";
import { useInterviewRecording } from "../../hooks/useInterviewRecording";
import "./InterviewSession.css";

function QuestionPanel({ question, onSubmit, loading, audioUrl, onExit, startAnswerRecording, stopAnswerRecording }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);

  const startRec = () => {
    startAnswerRecording();
    setRecording(true);
    setAudioBlob(null);
    setAudioURL(null);
  };

  const stopRec = async () => {
    const blob = await stopAnswerRecording();
    if (blob) {
      setAudioBlob(blob);
      setAudioURL(URL.createObjectURL(blob));
    }
    setRecording(false);
  };
  
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

export default function InterviewSession() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState(location.state?.role ? "loading" : "redirecting");
  const [question, setQuestion] = useState(null);
  const [sessionId, setSessionId] = useState(location.state?.session_id || null);
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  const {
    videoStream,
    videoError,
    initCamera,
    isRecording,
    isFinishing,
    startBackgroundVideoRecording,
    stopBackgroundVideoRecording,
    startAnswerRecording,
    stopAnswerRecording
  } = useInterviewRecording(sessionId, "tech", getToken);

  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

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
      const stream = await initCamera();
      if (!stream) {
        throw new Error("Camera initialization failed. Please check permissions.");
      }
      
      const q = await startInterview(role, getToken);
      setQuestion(q);
      setPhase("question");
      
      if (q.session_id) {
        setSessionId(q.session_id);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
    playQuestionAudio();
  };

  useEffect(() => {
    // Only start background recording when we have both a stream and a session ID
    if (sessionId && videoStream && !isRecording && !isFinishing) {
      startBackgroundVideoRecording(videoStream);
    }
  }, [sessionId, videoStream, isRecording, isFinishing, startBackgroundVideoRecording]);

  useEffect(() => {
    const role = location.state?.role;
    if (role) {
      handleStart(role);
    } else {
      navigate('/interview/setup', { replace: true });
    }
    
    return () => {
      // Cleanup hook handles stream stop, but we want to ensure stopBackgroundVideoRecording isn't missed on unmount
      if (isRecording) {
        stopBackgroundVideoRecording();
      }
    };
  }, []); // eslint-disable-line

  const handleSubmit = async (audioBlob) => {
    setLoading(true); setError(null);
    try {
      const data = await evaluateAnswer(audioBlob, getToken);
      if (data.next_question?.round_complete) {
        setPhase("completing");
        await stopBackgroundVideoRecording();
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

  const handleExit = async () => {
    await stopBackgroundVideoRecording();
    navigate('/interview');
  };

  return (
    <div className="is-page">
      {/* Background continuous video feed pinned to the top right using user requested styling */}
      <div className="is-camera-feed" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '240px',
        height: '180px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        backgroundColor: '#1E1E1E',
        border: '2px solid var(--primary)' // Assuming there is a var(--primary) defined in the platform colors
      }}>
        {videoStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
            Camera Off
          </div>
        )}
      </div>

      {(error || videoError) && (
        <div className="is-error-banner">
          ⚠️ {error || videoError}
          <button onClick={() => { setError(null); }} className="is-error-close">✕</button>
        </div>
      )}
      {(phase === "loading" || phase === "redirecting") && (
        <div className="is-centered">
          <h2 className="is-heading">Starting your interview…</h2>
          <p className="is-sub">Setting things up and accessing your camera.</p>
        </div>
      )}
      {phase === "completing" && (
        <div className="is-centered">
          <h2 className="is-heading">Finishing up…</h2>
          <p className="is-sub">Saving your background video and wrapping up your session. Please do not close this window.</p>
        </div>
      )}
      {phase === "question" && question && (
        <QuestionPanel
          key={question.question_number}
          question={question}
          onSubmit={handleSubmit}
          loading={loading || isFinishing}
          audioUrl={questionAudioUrl}
          onExit={handleExit}
          startAnswerRecording={startAnswerRecording}
          stopAnswerRecording={stopAnswerRecording}
        />
      )}
    </div>
  );
}
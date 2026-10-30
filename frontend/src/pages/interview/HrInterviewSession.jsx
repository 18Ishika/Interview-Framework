import { goNext, clearSession, isSessionActive } from '../../utils/sessionFlow';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { startHrInterview, evaluateHrAnswer, getHrQnaResults, fetchHrQuestionAudio } from "../../api/interviewApi";
import { useInterviewRecording } from "../../hooks/useInterviewRecording";
import InterviewRoom from "../../components/interview-room/InterviewRoom";
import "../../styles/virtual-interview.css";
import "./InterviewSession.css";

function stopWithTimeout(stop, message) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), 8000);
    Promise.resolve()
      .then(stop)
      .then(
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
  });
}

function QuestionPanel({ question, onSubmit, loading, audioUrl, onReplay, onExit, startAnswerRecording, stopAnswerRecording }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);

  const startRec = async () => {
    try {
      await startAnswerRecording();
      setRecording(true);
      setAudioBlob(null);
      setAudioURL(null);
    } catch (error) {
      console.error("Recording start failed:", error);
    }
  };

  const stopRec = async () => {
    try {
      const blob = await stopAnswerRecording();
      if (blob) {
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error("Recording stop failed:", error);
    } finally {
      setRecording(false);
    }
  };
  
  const pct = Math.round((question.question_number / question.total_questions) * 100);

  return (
    <section className="irs-panel" aria-live="polite">
      <div className="irs-progress">
        <div className="irs-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="irs-meta">
        <span>Question {question.question_number} of {question.total_questions}</span>
        <span className="irs-badge">{question.topic} · {question.concept}</span>
      </div>
      <p className="irs-question">{question.question}</p>
      <div className="irs-actions">
        <div className="irs-actions__left">
          <button className="irs-btn" onClick={onReplay} disabled={!audioUrl}>🔊 Replay</button>
          <button className="irs-btn irs-btn--danger" onClick={onExit}>✕ Exit</button>
        </div>
        <div className="irs-actions__right">
          {!audioBlob && !recording && (
            <button className="irs-btn irs-btn--record" onClick={startRec}>🎙 Start recording</button>
          )}
          {recording && (
            <>
              <span className="irs-rec"><i /> Recording…</span>
              <button className="irs-btn irs-btn--stop" onClick={stopRec}>⏹ Stop</button>
            </>
          )}
          {audioBlob && (
            <>
              <audio controls src={audioURL} className="irs-audio" />
              <button className="irs-btn" onClick={() => { setAudioBlob(null); setAudioURL(null); }}>Re-record</button>
              <button className="irs-btn irs-btn--primary" onClick={() => onSubmit(audioBlob)} disabled={loading}>
                {loading ? "Evaluating…" : "Submit answer →"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}


function useAutoFullscreen() {
  useEffect(() => {
    const enter = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    enter();
    window.addEventListener("click", enter, { once: true });
    window.addEventListener("keydown", enter, { once: true });
    return () => {
      window.removeEventListener("click", enter);
      window.removeEventListener("keydown", enter);
    };
  }, []);
}

export default function HrInterviewSession() {
  useAutoFullscreen();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState(location.state?.role ? "loading" : "loading");
  const [question, setQuestion] = useState(null);
  const [sessionId, setSessionId] = useState(location.state?.sessionId || null);
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const exitingRef = useRef(false);

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
  } = useInterviewRecording(sessionId, "hr", getToken);

  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const playAudio = (url) => {
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay = () => setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onpause = () => setSpeaking(false);
    audio.onerror = () => setSpeaking(false);
    audio.play().catch(() => setSpeaking(false));
  };

  const playQuestionAudio = async () => {
    try {
      const url = await fetchHrQuestionAudio(getToken);
      setQuestionAudioUrl(url);
      playAudio(url);
    } catch (e) { console.error("Audio fetch failed", e); }
  };

  const handleReplay = () => {
    if (questionAudioUrl) playAudio(questionAudioUrl);
  };

  const startAnswer = async () => {
    audioRef.current?.pause();
    setSpeaking(false);
    await startAnswerRecording();
    setUserSpeaking(true);
  };

  const stopAnswer = async () => {
    try {
      return await stopAnswerRecording();
    } finally {
      setUserSpeaking(false);
    }
  };

  const handleStart = async () => {
    setLoading(true); setError(null);
    try {
      const stream = await initCamera();
      if (!stream) {
        throw new Error("Camera initialization failed. Please check permissions.");
      }
      
      const q = location.state?.initialQuestion || await startHrInterview(getToken);
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
    // Interview setup intentionally initializes state from this mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleStart();
    
    return () => {
      // Cleanup hook handles stream stop, but we want to ensure stopBackgroundVideoRecording isn't missed on unmount
      audioRef.current?.pause();
      if (isRecording) {
        stopBackgroundVideoRecording();
      }
    };
  }, []); // eslint-disable-line

  const handleSubmit = async (audioBlob) => {
    setLoading(true); setError(null);
    try {
      const data = await evaluateHrAnswer(audioBlob, getToken);
      if (data.next_question?.round_complete) {
        setPhase("completing");
        await stopBackgroundVideoRecording();
        await getHrQnaResults(getToken); // Trigger celery evaluation
        const wasSession = isSessionActive();
        if (wasSession) {
          alert("All 3 rounds (Coding, Technical, HR) completed successfully! You will get your results shortly.");
        } else {
          alert("Your HR interview is complete! You will get your results shortly.");
        }
        goNext(navigate, '/dashboard');
      } else {
        setQuestion(data.next_question);
        playQuestionAudio();
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleExit = async () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    audioRef.current?.pause();
    setUserSpeaking(false);

    try {
      try {
        await stopWithTimeout(
          stopAnswerRecording,
          "Timed out stopping answer recording."
        );
      } catch (e) {
        console.error("Answer recording stop failed:", e);
      }

      try {
        await stopWithTimeout(
          stopBackgroundVideoRecording,
          "Timed out stopping background recording."
        );
      } catch (e) {
        console.error("Background recording stop failed:", e);
      }
    } finally {
      videoStream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      clearSession();
      navigate("/interview", { replace: true });
    }
  };

  return (
    <div className="irs-page">
      <div className="irs-room">
        <InterviewRoom motionEnabled speaking={speaking} candidateSpeaking={userSpeaking} />
      </div>

      <div className="irs-camera">
        {videoStream ? (
          <video ref={videoRef} autoPlay muted playsInline />
        ) : (
          <div className="irs-camera__off">Camera Off</div>
        )}
        {isRecording && <span className="irs-camera__rec"><i /> REC</span>}
      </div>

      {(error || videoError) && (
        <div className="irs-error">
          ⚠️ {error || videoError}
          <button onClick={() => { setError(null); }}>✕</button>
        </div>
      )}
      {(phase === "loading" || phase === "redirecting") && (
        <div className="irs-center">
          <h2>Starting your HR interview…</h2>
          <p>Setting things up and accessing your camera.</p>
        </div>
      )}
      {phase === "completing" && (
        <div className="irs-center">
          <h2>Finishing up…</h2>
          <p>Saving your background video and wrapping up your session. Please do not close this window.</p>
        </div>
      )}
      {phase === "question" && question && (
        <QuestionPanel
          key={question.question_number}
          question={question}
          onSubmit={handleSubmit}
          loading={loading || isFinishing}
          audioUrl={questionAudioUrl}
          onReplay={handleReplay}
          onExit={handleExit}
          startAnswerRecording={startAnswer}
          stopAnswerRecording={stopAnswer}
        />
      )}
    </div>
  );
}

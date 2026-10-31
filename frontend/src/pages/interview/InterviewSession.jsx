import { goNext, clearSession, hasNextRound } from "../../utils/sessionFlow";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCandidateAvatar } from "../../utils/candidateAvatar";
import {
  startInterview,
  evaluateAnswer,
  getResults,
  fetchQuestionAudio,
} from "../../api/interviewApi";

import { useInterviewRecording } from "../../hooks/useInterviewRecording";
import InterviewRoom from "../../components/interview-room/InterviewRoom";
import WelcomeIntro from "../../components/interview-room/WelcomeIntro";

import "../../styles/virtual-interview.css";
import "./InterviewSession.css";

// Types text out one character at a time, only once `enabled` is true
function useTypewriter(text, speed = 55, enabled = true) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    if (!text || !enabled) return undefined;

    const id = setInterval(() => {
      setN((i) => {
        if (i >= text.length) {
          clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, speed);

    return () => clearInterval(id);
  }, [text, speed, enabled]);

  return {
    typed: text ? text.slice(0, n) : "",
    done: !!text && enabled && n >= text.length,
  };
}

// Live speech-to-text (Web Speech API, Chrome/Edge)
function useSpeechToText() {
  const recRef = useRef(null);
  const finalRef = useRef("");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");

  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = () => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    finalRef.current = "";
    setTranscript("");
    setInterim("");

    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else live += t;
      }
      setTranscript(finalRef.current);
      setInterim(live);
    };

    // Chrome auto-stops after silence, restart while still recording
    rec.onend = () => {
      if (recRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  };

  const stop = () => {
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
    setInterim("");
  };

  const clear = () => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
  };

  useEffect(() => () => stop(), []); // eslint-disable-line

  return { transcript, interim, start, stop, clear, supported: !!SR };
}

// Goes fullscreen automatically: tries on load, falls back to the first click/key
function useAutoFullscreen() {
  useEffect(() => {
    const enter = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };

    const onGesture = () => {
      enter();
      cleanup(); // one-shot, so it won't fight the Exit button
    };

    enter(); // works if the Start/Begin click was just before

    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return cleanup;
  }, []);
}

function QuestionPanel({
  question,
  textGo,
  onSubmit,
  loading,
  onReplay,
  onExit,
  startAnswerRecording,
  stopAnswerRecording,
}) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);

  const { typed, done } = useTypewriter(question.question, 55, textGo);
  const speech = useSpeechToText();

  const startRec = async () => {
    try {
      await startAnswerRecording();
      speech.start();

      setRecording(true);
      setAudioBlob(null);
      setAudioURL(null);
    } catch (error) {
      console.error("Recording start failed:", error);
    }
  };

  const stopRec = async () => {
    speech.stop();

    try {
      const blob = await stopAnswerRecording();

      if (blob) {
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      }

      setRecording(false);
    } catch (error) {
      console.error("Recording stop failed:", error);
      setRecording(false);
    }
  };

  const pct = Math.round(
    (question.question_number / question.total_questions) * 100
  );

  return (
    <section className="irs-panel" aria-live="polite">
      <div className="irs-progress">
        <div className="irs-progress__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="irs-meta">
        <span>
          Question {question.question_number} of {question.total_questions}
        </span>

        <span className="irs-badge">
          {question.topic} · {question.concept}
        </span>
      </div>

      <p className="irs-question">
        {textGo ? (
          <>
            {typed}
            {!done && <span className="irs-cursor" />}
          </>
        ) : (
          <span className="irs-cursor" />
        )}
      </p>

      {(recording || speech.transcript) && (
        <div className="irs-transcript">
          <span className="irs-transcript__label">Your answer</span>
          <p>
            {speech.transcript}
            <span className="irs-transcript__interim">{speech.interim}</span>
          </p>
        </div>
      )}

      <div className="irs-actions">
        <div className="irs-actions__left">
          <button className="irs-btn" onClick={onReplay}>
            🔊 Replay
          </button>

          <button className="irs-btn irs-btn--danger" onClick={onExit}>
            ✕ Exit
          </button>
        </div>

        <div className="irs-actions__right">
          {!audioBlob && !recording && (
            <button className="irs-btn irs-btn--record" onClick={startRec}>
              🎙 Start recording
            </button>
          )}

          {recording && (
            <>
              <span className="irs-rec">
                <i /> Recording…
              </span>

              <button className="irs-btn irs-btn--stop" onClick={stopRec}>
                ⏹ Stop
              </button>
            </>
          )}

          {audioBlob && (
            <>
              <audio controls src={audioURL} className="irs-audio" />

              <button
                className="irs-btn"
                onClick={() => {
                  setAudioBlob(null);
                  setAudioURL(null);
                  speech.clear();
                }}
              >
                Re-record
              </button>

              <button
                className="irs-btn irs-btn--primary"
                onClick={() => onSubmit(audioBlob)}
                disabled={loading}
              >
                {loading ? "Evaluating…" : "Submit answer →"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function InterviewSession() {
  const { getToken } = useAuth();
  const candidateAvatarUrl = useCandidateAvatar();
  const navigate = useNavigate();
  const location = useLocation();

  useAutoFullscreen();

  const [phase, setPhase] = useState(
    location.state?.role ? "loading" : "redirecting"
  );

  const [question, setQuestion] = useState(null);
  const [sessionId, setSessionId] = useState(
    location.state?.session_id || null
  );

  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);

  const [speaking, setSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [textGo, setTextGo] = useState(false); // true once the interviewer's voice starts
  const firstAudioRef = useRef(false);

  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Refs so cleanup / exit always see the latest values (no stale closures)
  const streamRef = useRef(null);
  const streamsRef = useRef(new Set()); // every stream we ever got
  const unmountedRef = useRef(false);
  const stopBgRef = useRef(null);
  const stopAnswerRef = useRef(null);
  const answeringRef = useRef(false);
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
    stopAnswerRecording,
  } = useInterviewRecording(sessionId, "tech", getToken);

  // keep refs fresh
  useEffect(() => {
    streamRef.current = videoStream;
    if (videoStream) streamsRef.current.add(videoStream);
  }, [videoStream]);

  useEffect(() => {
    stopBgRef.current = stopBackgroundVideoRecording;
    stopAnswerRef.current = stopAnswerRecording;
  });

  // Attach camera stream to preview
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // ---------- media cleanup helpers ----------

  // Never lets a hanging recorder block navigation
  const safeStopBackground = async () => {
    try {
      await Promise.race([
        Promise.resolve(stopBgRef.current?.()),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);
    } catch (e) {
      console.error("Background recording stop failed:", e);
    }
  };

  const leaveFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Turns off camera + mic (every stream we ever opened)
  const releaseMedia = () => {
    const all = new Set(streamsRef.current);
    if (streamRef.current) all.add(streamRef.current);
    if (videoRef.current?.srcObject) all.add(videoRef.current.srcObject);

    all.forEach((s) => s.getTracks().forEach((t) => t.stop()));

    streamsRef.current.clear();
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    audioRef.current?.pause();
  };

  // ---------- interviewer audio ----------

  const playAudio = (url) => {
    audioRef.current?.pause();

    const a = new Audio(url);
    audioRef.current = a;

    // text starts typing the moment the voice starts
    a.onplay = () => {
      setSpeaking(true);
      setTextGo(true);
    };
    a.onended = () => setSpeaking(false);
    a.onpause = () => setSpeaking(false);
    a.onerror = () => {
      setSpeaking(false);
      setTextGo(true);
    };

    a.play().catch(() => {
      setSpeaking(false);
      setTextGo(true);
    });
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    setSpeaking(false);
  };

  const playQuestionAudio = async () => {
    try {
      const url = await fetchQuestionAudio(getToken);

      setQuestionAudioUrl(url);
      playAudio(url);
    } catch (e) {
      console.error("Audio fetch failed", e);
      setTextGo(true); // show the text even if audio fails
    }
  };

  const handleReplay = () => {
    if (questionAudioUrl) {
      playAudio(questionAudioUrl);
    }
  };

  // ==========================================
  // CANDIDATE MICROPHONE + AVATAR FOCUS CONTROL
  // ==========================================

  const startAnswer = async () => {
    stopAudio();
    setUserSpeaking(true);

    try {
      await startAnswerRecording();
      answeringRef.current = true;
    } catch (err) {
      setUserSpeaking(false);
      throw err;
    }
  };

  const stopAnswer = async () => {
    try {
      return await stopAnswerRecording();
    } finally {
      answeringRef.current = false;
      setUserSpeaking(false);
    }
  };

  // ==========================================

  const handleStart = async (role) => {
    setLoading(true);
    setError(null);

    try {
      const stream = await initCamera();

      if (stream) streamsRef.current.add(stream);

      // user already left while the camera was starting: don't keep it on
      if (unmountedRef.current || exitingRef.current) {
        releaseMedia();
        return;
      }

      if (!stream) {
        throw new Error(
          "Camera initialization failed. Please check permissions."
        );
      }

      streamRef.current = stream;

      const q =
        location.state?.initialQuestion ||
        (await startInterview(role, getToken));

      setQuestion(q);
      setPhase("question");

      if (q.session_id) {
        setSessionId(q.session_id);
      }
      // first audio is started by the effect below, after the intro
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Start background video recording
  useEffect(() => {
    if (
      sessionId &&
      videoStream &&
      !isRecording &&
      !isFinishing &&
      !exitingRef.current
    ) {
      startBackgroundVideoRecording(videoStream);
    }
  }, [
    sessionId,
    videoStream,
    isRecording,
    isFinishing,
    startBackgroundVideoRecording,
  ]);

  // Initialize interview
  useEffect(() => {
    unmountedRef.current = false;
    const role = location.state?.role;

    if (role) {
      handleStart(role);
    } else {
      navigate("/interview/setup", { replace: true });
    }

    // Unmount cleanup: always release camera/mic, even if user navigates away
    return () => {
      unmountedRef.current = true;
      stopBgRef.current?.();
      releaseMedia();

      // deferred so StrictMode's dev remount doesn't kick us out of fullscreen
      setTimeout(() => {
        if (unmountedRef.current && !hasNextRound()) leaveFullscreen();
      }, 0);
    };
  }, []); // eslint-disable-line

  // first question's audio starts only after Alan's welcome is gone
  useEffect(() => {
    if (introDone && phase === "question" && question && !firstAudioRef.current) {
      firstAudioRef.current = true;
      playQuestionAudio();
    }
  }, [introDone, phase, question]); // eslint-disable-line

  // Submit answer and get next question
  const handleSubmit = async (audioBlob) => {
    setLoading(true);
    setError(null);

    try {
      stopAudio();

      const data = await evaluateAnswer(audioBlob, getToken);

      if (data.next_question?.round_complete) {
        exitingRef.current = true;
        setPhase("completing");

        await safeStopBackground();
        await getResults(getToken);

        releaseMedia();

        if (!hasNextRound()) {
          leaveFullscreen();
        }

        if (hasNextRound()) {
          alert("Technical round complete! Proceeding to HR round...");
        } else {
          alert("Your interview is complete! You will get your results within 3-5 mins.");
        }

        goNext(navigate, "/dashboard");
      } else {
        setTextGo(false); // hold the text until the next voice starts
        setQuestion(data.next_question);
        playQuestionAudio();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Exit interview: always navigates, always releases camera/mic
  const handleExit = async () => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    stopAudio();
    setUserSpeaking(false);

    try {
      // stop an in-progress answer recording (mic) first
      if (answeringRef.current) {
        try {
          await stopAnswerRef.current?.();
        } catch (e) {
          console.error("Answer recording stop failed:", e);
        }
        answeringRef.current = false;
      }

      await safeStopBackground();
    } finally {
      releaseMedia();
      leaveFullscreen();
      clearSession();
      navigate("/interview", { replace: true });
    }
  };

  return (
    <div className="irs-page">
      {/* Full-screen 3D interview room */}
      <div className="irs-room">
        <InterviewRoom
        motionEnabled
        speaking={speaking}
        candidateSpeaking={userSpeaking}
        candidateAvatarUrl={candidateAvatarUrl}
      />
      </div>

      {/* Live camera preview */}
      <div className="irs-camera">
        {videoStream ? (
          <video ref={videoRef} autoPlay muted playsInline />
        ) : (
          <div className="irs-camera__off">Camera Off</div>
        )}

        {isRecording && (
          <span className="irs-camera__rec">
            <i /> REC
          </span>
        )}
      </div>

      {/* Error messages */}
      {(error || videoError) && (
        <div className="irs-error">
          ⚠️ {error || videoError}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Loading */}
      {(phase === "loading" || phase === "redirecting") && (
        <div className="irs-center">
          <h2>Starting your interview…</h2>
          <p>Setting things up and accessing your camera.</p>
        </div>
      )}

      {/* Completing */}
      {phase === "completing" && (
        <div className="irs-center">
          <h2>Finishing up…</h2>
          <p>
            Saving your video and wrapping up your session. Please do not close
            this window.
          </p>
        </div>
      )}

      {/* Question panel */}
      {phase === "question" && question && introDone && (
        <QuestionPanel
          key={question.question_number}
          question={question}
          textGo={textGo}
          onSubmit={handleSubmit}
          loading={loading || isFinishing}
          onReplay={handleReplay}
          onExit={handleExit}
          startAnswerRecording={startAnswer}
          stopAnswerRecording={stopAnswer}
        />
      )}

      {/* Alan Turing welcome: covers everything until the greeting is done and the session is ready */}
      {!introDone && (
        <WelcomeIntro
          waitFor={phase === "question" || !!error}
          onDone={() => setIntroDone(true)}
        />
      )}
    </div>
  );
}
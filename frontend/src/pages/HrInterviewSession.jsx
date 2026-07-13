import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "./InterviewSession.css";

export default function HrInterviewSession() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState("setup"); // setup, recording, finishing, finished
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 });

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  
  const chunkIndexRef = useRef(0);
  const uploadPromisesRef = useRef([]);
  const uploadedCountRef = useRef(0);
  const requestDataIntervalRef = useRef(null);

  const [sessionId, setSessionId] = useState(location.state?.sessionId || null);

  useEffect(() => {
    if (!sessionId) {
      import("../api/interviewApi").then(({ startHrInterview }) => {
        startHrInterview(getToken).then(data => {
          setSessionId(data.session_id);
        }).catch(err => {
          console.error("Failed to start HR session", err);
          setError("Failed to create interview session.");
        });
      });
    }
  }, [sessionId, getToken]);

  const startRecording = async () => {
    if (!sessionId) {
      setError("Session not initialized yet. Please wait.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      // Pick a supported mimeType
      let mimeType = "video/webm";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
          mimeType = "video/webm;codecs=vp9";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
          mimeType = "video/webm;codecs=vp8";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mimeType = "video/webm";
        } else {
          mimeType = ""; // Let the browser pick its default
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunkIndexRef.current = 0;
      uploadPromisesRef.current = [];
      uploadedCountRef.current = 0;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && sessionId) {
          const currentIndex = chunkIndexRef.current;
          chunkIndexRef.current += 1;
          
          // Update total count immediately so the progress bar is accurate
          setUploadProgress(prev => ({
            ...prev,
            total: currentIndex + 1
          }));
          
          const formData = new FormData();
          formData.append("session_id", sessionId);
          formData.append("chunk_index", currentIndex);
          formData.append("chunk", new Blob([e.data], { type: "video/webm" }), `chunk_${currentIndex}.webm`);
          
          const apiUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/tech-int', '/hr-int') : "http://localhost:8000/api/hr-int";
          
          // Track this promise so we can wait for ALL of them on finish
          const uploadPromise = fetch(`${apiUrl}/upload-chunk/`, {
            method: "POST",
            body: formData
          }).then(() => {
            uploadedCountRef.current += 1;
            setUploadProgress(prev => ({ ...prev, uploaded: uploadedCountRef.current }));
          }).catch(err => {
            console.error(`Chunk ${currentIndex} upload failed:`, err);
            uploadedCountRef.current += 1; // Count it anyway so we don't block forever
            setUploadProgress(prev => ({ ...prev, uploaded: uploadedCountRef.current }));
          });
          
          uploadPromisesRef.current.push(uploadPromise);
        }
      };

      // Start recording without timeslice. This prevents the browser from doing auto-chunking.
      mediaRecorder.start();

      // Explicitly request data every 20 seconds to guarantee chunks are generated
      // and uploaded steadily throughout the interview.
      requestDataIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.requestData();
        }
      }, 20000);

      setPhase("recording");
      setError(null);
    } catch (err) {
      console.error("Error starting recording:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera/Microphone access denied. Please allow access and try again.");
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
    }
  };

  // Auto-start recording once session is initialized
  useEffect(() => {
    if (sessionId && phase === "setup") {
      startRecording();
    }
  }, [sessionId, phase]);

  const stopRecording = () => {
    if (requestDataIntervalRef.current) {
      clearInterval(requestDataIntervalRef.current);
    }

    // Stop the media recorder — this fires one final ondataavailable
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        // All chunks have now been queued. Wait for them all to upload.
        waitForAllChunksAndFinish();
      };
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    setPhase("finishing");
  };

  const waitForAllChunksAndFinish = async () => {
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    try {
      // Wait for EVERY chunk to reach the server — no data loss
      await Promise.all(uploadPromisesRef.current);
      
      // All chunks confirmed delivered. Now tell backend to assemble.
      const apiUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/tech-int', '/hr-int') : "http://localhost:8000/api/hr-int";
      await fetch(`${apiUrl}/finish-upload/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          total_chunks: chunkIndexRef.current
        })
      });

      setPhase("finished");
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to finalize video upload:", err);
      setError("Something went wrong while saving your video. Please try again.");
      setPhase("finished");
    }
  };

  useEffect(() => {
    if (phase === "recording" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (requestDataIntervalRef.current) {
        clearInterval(requestDataIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="is-page">
      {error && (
        <div className="is-error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="is-error-close">✕</button>
        </div>
      )}

      {phase === "setup" && (
        <div className="is-centered">
          <h2 className="is-heading">Initializing Interview...</h2>
          <p className="is-sub">Please wait while we connect your camera and microphone.</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="is-panel" style={{ alignItems: 'center' }}>
          <h3 className="is-heading">Recording HR Interview...</h3>
          <div className="is-rec-indicator" style={{ marginBottom: "20px" }}>
            <span className="is-dot" /> Live
          </div>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{ width: "100%", maxWidth: "600px", borderRadius: "10px", background: "#000" }}
          />
          <div className="is-question-actions" style={{ marginTop: "20px" }}>
            <button className="is-btn-stop" onClick={stopRecording}>
              ⏹ Finish Interview
            </button>
          </div>
        </div>
      )}

      {phase === "finishing" && (
        <div className="is-centered">
          <h2 className="is-heading">Saving your interview...</h2>
          <p className="is-sub" style={{ maxWidth: "450px", margin: "0 auto 20px" }}>
            Please wait while we securely upload your recording. <strong>Do not close this tab.</strong>
          </p>
          <div style={{ 
            background: "rgba(59, 130, 246, 0.1)", 
            border: "1px solid rgba(59, 130, 246, 0.3)", 
            borderRadius: "12px", 
            padding: "20px 30px", 
            marginTop: "10px",
            minWidth: "280px"
          }}>
            <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "8px" }}>
              Uploading: {uploadProgress.total > 0 ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100) : 0}%
            </div>
            <div style={{ 
              width: "100%", 
              height: "8px", 
              background: "rgba(255,255,255,0.1)", 
              borderRadius: "4px",
              overflow: "hidden" 
            }}>
              <div style={{ 
                width: uploadProgress.total > 0 ? `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` : "0%",
                height: "100%", 
                background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", 
                borderRadius: "4px",
                transition: "width 0.3s ease" 
              }} />
            </div>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="is-centered">
          <h2 className="is-heading">Interview Completed</h2>
          <p className="is-sub">Your video has been recorded and is being processed.</p>
          <button className="is-btn-primary" onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

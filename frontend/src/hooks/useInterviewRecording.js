import { useState, useRef, useEffect, useCallback } from "react";

export function useInterviewRecording(sessionId, roundType, tokenGetter) {
  const [videoStream, setVideoStream] = useState(null);
  const [videoError, setVideoError] = useState(null);

  // Phase tracking
  const [isRecording, setIsRecording] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 });

  // Recorder A: Continuous Video
  const mediaRecorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const uploadPromisesRef = useRef([]);
  const uploadedCountRef = useRef(0);
  const requestDataIntervalRef = useRef(null);

  // Recorder B: Audio Q&A
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      setVideoError(null);
      return stream;
    } catch (err) {
      console.error("Camera access denied or failed", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setVideoError("Camera/Microphone access denied. Please allow access and try again.");
      } else {
        setVideoError(`Failed to access camera: ${err.message}`);
      }
      return null;
    }
  }, []);

  const startBackgroundVideoRecording = useCallback((stream) => {
    if (!sessionId) {
      setVideoError("Cannot start background recording without a session ID.");
      return;
    }

    let mimeType = "video/webm";
    if (typeof MediaRecorder.isTypeSupported === "function") {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeType = "video/webm;codecs=vp8";
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm";
      } else {
        mimeType = "";
      }
    }

    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    chunkIndexRef.current = 0;
    uploadPromisesRef.current = [];
    uploadedCountRef.current = 0;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && sessionId) {
        const currentIndex = chunkIndexRef.current;
        chunkIndexRef.current += 1;

        setUploadProgress(prev => ({ ...prev, total: currentIndex + 1 }));

        const formData = new FormData();
        formData.append("session_id", sessionId);
        formData.append("chunk_index", currentIndex);
        formData.append("chunk", new Blob([e.data], { type: "video/webm" }), `chunk_${currentIndex}.webm`);

        const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
        const endpoint = `${apiUrl}/${roundType}-int/upload-chunk/`;

        // Create promise synchronously so it is immediately tracked in uploadPromisesRef
        const uploadTask = (async () => {
          try {
            const token = await tokenGetter();
            await fetch(endpoint, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`
              },
              body: formData
            });
            uploadedCountRef.current += 1;
            setUploadProgress(prev => ({ ...prev, uploaded: uploadedCountRef.current }));
          } catch (err) {
            console.error(`Chunk ${currentIndex} upload failed:`, err);
            uploadedCountRef.current += 1;
            setUploadProgress(prev => ({ ...prev, uploaded: uploadedCountRef.current }));
          }
        })();

        uploadPromisesRef.current.push(uploadTask);
      }
    };

    // Emit chunk data every 5 seconds (5000ms) for steady background uploading
    mediaRecorder.start(5000);

    setIsRecording(true);
  }, [sessionId, roundType, tokenGetter]);

  const startAnswerRecording = useCallback(() => {
    if (!videoStream) return null;

    const audioStream = new MediaStream(videoStream.getAudioTracks());
    const mr = new MediaRecorder(audioStream);
    audioRecorderRef.current = mr;
    audioChunksRef.current = [];

    mr.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
    mr.start();
  }, [videoStream]);

  const stopAnswerRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!audioRecorderRef.current) {
        resolve(null);
        return;
      }

      audioRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        resolve(blob);
      };

      if (audioRecorderRef.current.state !== "inactive") {
        audioRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  }, []);

  const stopBackgroundVideoRecording = useCallback(async () => {
    setIsFinishing(true);

    if (requestDataIntervalRef.current) {
      clearInterval(requestDataIntervalRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const stopPromise = new Promise(resolve => {
        mediaRecorderRef.current.onstop = resolve;
      });
      mediaRecorderRef.current.stop();
      await stopPromise;
    }

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }

    // Wait for all chunk uploads to finish
    await Promise.all(uploadPromisesRef.current);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
    const endpoint = `${apiUrl}/${roundType}-int/finish-upload/`;

    try {
      const token = await tokenGetter();
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          total_chunks: chunkIndexRef.current
        })
      });
    } catch (err) {
      console.error("Failed to finalize video upload:", err);
      setVideoError("Something went wrong while saving your background video.");
    }

    setIsFinishing(false);
    setIsRecording(false);
  }, [sessionId, roundType, tokenGetter, videoStream]);

  useEffect(() => {
    return () => {
      if (requestDataIntervalRef.current) {
        clearInterval(requestDataIntervalRef.current);
      }
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  return {
    videoStream,
    videoError,
    initCamera,

    // Recorder A properties (Continuous)
    isRecording,
    isFinishing,
    uploadProgress,
    startBackgroundVideoRecording,
    stopBackgroundVideoRecording,

    // Recorder B properties (Q&A Audio)
    startAnswerRecording,
    stopAnswerRecording
  };
}

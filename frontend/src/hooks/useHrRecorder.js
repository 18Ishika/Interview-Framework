import { useRef, useState } from "react";
import { uploadChunk } from "../api/hrinterview";

const CHUNK_DURATION_MS = 180000; // 3 min

export function useHrRecorder(sessionId) {
  const mediaRecorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const pendingUploads = useRef([]);
  const [recording, setRecording] = useState(false);

  const start = async (existingStream) => {
    const stream = existingStream || await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      const index = chunkIndexRef.current++;
      pendingUploads.current.push(
        uploadChunk(sessionId, index, event.data).catch((e) => console.error(e))
      );
    };

    recorder.start(CHUNK_DURATION_MS);
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stop = async () => {
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        await Promise.all(pendingUploads.current);
        setRecording(false);
        resolve(chunkIndexRef.current);
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    });
  };

  return { start, stop, recording };
}
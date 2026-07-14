# services/transcription.py
import imageio_ffmpeg
import numpy as np
import whisper

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

def patched_load_audio(file, sr=16000):
    cmd = [
        ffmpeg_exe, "-nostdin", "-threads", "0", "-i", file,
        "-f", "s16le", "-ac", "1", "-acodec", "pcm_s16le", "-ar", str(sr), "-"
    ]
    from subprocess import run
    out = run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

whisper.audio.load_audio = patched_load_audio

# Load model eagerly at module level
model = whisper.load_model("small")

def transcribe(audio_path: str) -> str:
    result = model.transcribe(audio_path)
    return result["text"].strip()
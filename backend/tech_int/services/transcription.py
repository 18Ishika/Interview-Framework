import os
import imageio_ffmpeg
import numpy as np
import whisper
from uuid import uuid4

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

def patched_load_audio(file, sr=16000):
    cmd = [
        ffmpeg_exe,
        "-nostdin",
        "-threads", "0",
        "-i", file,
        "-f", "s16le",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-ar", str(sr),
        "-"
    ]
    from subprocess import run
    out = run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

whisper.audio.load_audio = patched_load_audio

model = whisper.load_model("small")


def transcribe(audio_file) -> str:
    temp_path = os.path.join(os.path.dirname(__file__), f"temp_{uuid4()}.wav")

    with open(temp_path, "wb") as f:
        f.write(audio_file.read())

    result = model.transcribe(temp_path)
    os.remove(temp_path)

    return result["text"].strip()
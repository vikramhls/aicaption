"""
Transcriber Module — Whisper-based speech-to-text engine.
Handles audio extraction (FFmpeg) and transcription (OpenAI Whisper).
"""

import os
import subprocess
import whisper
import logging
import tempfile
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

# Cache the model globally so it loads only once
_model = None


def get_model(model_size: str = "base"):
    """Load and cache the Whisper model."""
    global _model
    if _model is None:
        logger.info(f"Loading Whisper '{model_size}' model (first load may take a minute)...")
        _model = whisper.load_model(model_size)
        logger.info("Whisper model loaded successfully.")
    return _model


def extract_audio(video_path: str, audio_path: str = None) -> str:
    """
    Extract audio from a video file using FFmpeg.

    Args:
        video_path: Path to the input video file.
        audio_path: Optional path for the output audio file.
                    If None, creates a temp file alongside the video.

    Returns:
        Path to the extracted audio file.
    """
    if audio_path is None:
        base = os.path.splitext(video_path)[0]
        audio_path = f"{base}_audio.wav"

    logger.info(f"Extracting audio from: {video_path}")

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vn",                    # No video
        "-acodec", "pcm_s16le",   # 16-bit PCM WAV
        "-ar", "16000",           # 16kHz sample rate (Whisper optimal)
        "-ac", "1",               # Mono channel
        "-y",                     # Overwrite output
        audio_path
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=300  # 5 min timeout
        )
        if result.returncode != 0:
            error_msg = result.stderr.decode("utf-8", errors="replace")
            logger.error(f"FFmpeg error: {error_msg}")
            raise RuntimeError(f"FFmpeg failed: {error_msg}")

        logger.info(f"Audio extracted to: {audio_path}")
        return audio_path

    except FileNotFoundError:
        raise RuntimeError(
            "FFmpeg not found. Install it: https://ffmpeg.org/download.html"
        )


def transcribe(video_path: str, model_size: str = "base", target_language: str = "native") -> dict:
    """
    Full transcription pipeline: extract audio → run Whisper.

    Args:
        video_path: Path to the input video file.
        model_size: Whisper model size (tiny, base, small, medium, large).
        target_language: Two-letter ISO language code for translation (e.g., 'en', 'hi', 'fr'), or 'native'.

    Returns:
        dict with keys:
            - "text": Full transcript as a single string.
            - "segments": List of segments with start, end, text.
            - "language": Detected language.
    """
    audio_path = None
    try:
        # Step 1: Extract audio
        audio_path = extract_audio(video_path)

        # Step 2: Load model and transcribe
        model = get_model(model_size)
        logger.info("Running Whisper transcription...")

        result = model.transcribe(
            audio_path,
            fp16=False,       # CPU mode — no FP16
            verbose=False
        )

        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "id": seg["id"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip()
            })

        # Process translation if required
        final_text = result["text"].strip()
        final_language = result.get("language", "en")

        if target_language and target_language.lower() != "native":
            logger.info(f"Translating {len(segments)} segments to '{target_language}'...")
            translator = GoogleTranslator(source='auto', target=target_language)
            
            translated_segments = []
            for seg in segments:
                if seg["text"]:
                    try:
                        translated_text = translator.translate(seg["text"])
                        seg["text"] = translated_text
                    except Exception as e:
                        logger.warning(f"Translation failed for segment {seg['id']}: {e}")
                translated_segments.append(seg)
            
            segments = translated_segments
            
            # Translate full text
            try:
                # If the full text is too long (GoogleTranslate max 5000 chars), we join segments
                final_text = " ".join([s["text"] for s in segments])
                final_language = target_language.lower()
            except Exception as e:
                logger.warning(f"Failed to join translated segments: {e}")

        output = {
            "text": final_text,
            "segments": segments,
            "language": final_language
        }

        logger.info(
            f"Transcription complete. Language: {output['language']}, "
            f"Segments: {len(segments)}"
        )
        return output

    finally:
        # Clean up extracted audio
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.debug(f"Cleaned up audio file: {audio_path}")
            except OSError:
                pass

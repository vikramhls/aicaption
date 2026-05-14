"""
Caption Generator — Converts Whisper transcription output to TXT and SRT formats.
"""

import os
import logging

logger = logging.getLogger(__name__)


def _format_srt_time(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_txt(transcription: dict, output_path: str) -> str:
    """
    Generate a plain text transcript file.

    Args:
        transcription: Dict from transcriber.transcribe() with "text" and "segments".
        output_path: Path to write the .txt file.

    Returns:
        Path to the generated file.
    """
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("  AI-GENERATED TRANSCRIPT\n")
        f.write(f"  Language: {transcription.get('language', 'unknown')}\n")
        f.write("=" * 60 + "\n\n")

        # Full text
        f.write(transcription["text"])
        f.write("\n\n")

        # Timestamped segments
        f.write("-" * 60 + "\n")
        f.write("  TIMESTAMPED SEGMENTS\n")
        f.write("-" * 60 + "\n\n")

        for seg in transcription.get("segments", []):
            start = _format_srt_time(seg["start"]).replace(",", ".")
            end = _format_srt_time(seg["end"]).replace(",", ".")
            f.write(f"[{start} --> {end}]  {seg['text']}\n")

    logger.info(f"TXT transcript saved: {output_path}")
    return output_path


def generate_srt(transcription: dict, output_path: str) -> str:
    """
    Generate an SRT subtitle file.

    Args:
        transcription: Dict from transcriber.transcribe() with "segments".
        output_path: Path to write the .srt file.

    Returns:
        Path to the generated file.
    """
    segments = transcription.get("segments", [])

    with open(output_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, start=1):
            start_time = _format_srt_time(seg["start"])
            end_time = _format_srt_time(seg["end"])

            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{seg['text']}\n")
            f.write("\n")

    logger.info(f"SRT subtitles saved: {output_path}")
    return output_path


def generate_captions(transcription: dict, output_dir: str, base_name: str) -> dict:
    """
    Generate both TXT and SRT caption files.

    Args:
        transcription: Dict from transcriber.transcribe().
        output_dir: Directory to save output files.
        base_name: Base filename (without extension).

    Returns:
        Dict with "txt" and "srt" keys pointing to file paths.
    """
    os.makedirs(output_dir, exist_ok=True)

    txt_path = os.path.join(output_dir, f"{base_name}.txt")
    srt_path = os.path.join(output_dir, f"{base_name}.srt")

    generate_txt(transcription, txt_path)
    generate_srt(transcription, srt_path)

    return {
        "txt": txt_path,
        "srt": srt_path
    }

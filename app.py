"""
AI Video Captioning System — Flask API
Endpoints:
    GET  /                     → Web UI
    POST /upload               → Upload video & start transcription
    GET  /status/<job_id>      → Check job status
    GET  /download/<filename>  → Download generated caption file
    GET  /jobs                 → List all jobs
"""

import os
import uuid
import logging
from datetime import datetime
from threading import Thread

from flask import (
    Flask, request, jsonify, send_from_directory,
    render_template, abort
)

from transcriber import transcribe
from caption_generator import generate_captions

# ---------------------------------------------------------------------------
#  Configuration
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "flv", "wmv", "m4v"}
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
#  App Setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# In-memory job store
jobs = {}

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def process_video(job_id: str, video_path: str, original_name: str, target_language: str = "native"):
    """Background worker: transcribe video and generate captions."""
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["step"] = "Extracting audio & transcribing..."

        # Run Whisper transcription
        result = transcribe(video_path, model_size="base", target_language=target_language)

        jobs[job_id]["step"] = "Generating captions..."

        # Generate TXT + SRT
        base_name = os.path.splitext(original_name)[0]
        safe_name = "".join(c if c.isalnum() or c in "-_ " else "_" for c in base_name)
        safe_name = f"{safe_name}_{job_id[:8]}"

        outputs = generate_captions(result, OUTPUT_DIR, safe_name)

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["step"] = "Done"
        jobs[job_id]["result"] = {
            "transcript": result["text"],
            "language": result["language"],
            "segments": len(result["segments"]),
            "files": {
                "txt": os.path.basename(outputs["txt"]),
                "srt": os.path.basename(outputs["srt"]),
            }
        }
        jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Job {job_id} completed successfully.")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["step"] = "Error"
        jobs[job_id]["error"] = str(e)

    finally:
        # Clean up uploaded video
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
            except OSError:
                pass


# ---------------------------------------------------------------------------
#  Routes
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    """Serve web UI."""
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    """Upload video and start transcription."""
    if "video" not in request.files:
        return jsonify({"error": "No video file provided. Use 'video' as the field name."}), 400

    file = request.files["video"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"Unsupported format. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    # Save file
    job_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[1].lower()
    save_path = os.path.join(UPLOAD_DIR, f"{job_id}.{ext}")
    file.save(save_path)
    
    target_language = request.form.get("target_language", "native")

    file_size = os.path.getsize(save_path)

    # Create job record
    jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "file_size": file_size,
        "status": "queued",
        "step": "Waiting to start...",
        "created_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "result": None,
        "error": None
    }

    # Start background processing
    thread = Thread(target=process_video, args=(job_id, save_path, file.filename, target_language))
    thread.daemon = True
    thread.start()

    logger.info(f"Job {job_id} created for: {file.filename} ({file_size} bytes)")

    return jsonify({
        "message": "Video uploaded successfully. Transcription started.",
        "job_id": job_id,
        "filename": file.filename,
        "file_size": file_size
    }), 202


@app.route("/status/<job_id>")
def status(job_id):
    """Check transcription job status."""
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found."}), 404
    return jsonify(job)


@app.route("/download/<filename>")
def download(filename):
    """Download a generated caption file."""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found."}), 404

    return send_from_directory(OUTPUT_DIR, safe_name, as_attachment=True)


@app.route("/jobs")
def list_jobs():
    """List all transcription jobs."""
    job_list = sorted(
        jobs.values(),
        key=lambda j: j["created_at"],
        reverse=True
    )
    return jsonify({"jobs": job_list, "total": len(job_list)})


# ---------------------------------------------------------------------------
#  Error Handlers
# ---------------------------------------------------------------------------

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        "error": f"File too large. Maximum size: {MAX_CONTENT_LENGTH // (1024*1024)} MB"
    }), 413


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error."}), 500


# ---------------------------------------------------------------------------
#  Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

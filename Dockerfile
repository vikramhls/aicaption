# ─────────────────────────────────────────────────────
#  AI Video Captioning System — Dockerfile
#  Python 3.10  |  FFmpeg  |  Whisper (base model)
# ─────────────────────────────────────────────────────

FROM python:3.10-slim

# System dependencies (FFmpeg + build tools for Whisper)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        git \
        build-essential \
        gcc \
    && rm -rf /var/lib/apt/lists/*

# Working directory
WORKDIR /app

# Install CPU-only PyTorch first (saves ~1.5GB vs full torch)
RUN pip install --no-cache-dir \
    torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the Whisper base model so first request isn't slow
RUN python -c "import whisper; whisper.load_model('base')"

# Copy application code
COPY . .

# Create directories
RUN mkdir -p uploads outputs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/')" || exit 1

# Run with Gunicorn WSGI server to handle large uploads without Docker proxy blocking
CMD ["gunicorn", "-w", "1", "--threads", "4", "--timeout", "300", "-b", "0.0.0.0:5000", "app:app"]

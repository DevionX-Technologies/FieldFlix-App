"""FieldFlicks live-stream & extraction gateway: NVR RTSP -> RTMP ingest (Mux) & S3 match extraction.

Endpoints:
- POST /start-live-stream
- POST /stop-live-stream
- POST /extract-session
- GET  /live-stream-status
- GET  /health
"""

from __future__ import annotations

import os
import shlex
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote
from datetime import datetime
import zoneinfo

import requests
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="FieldFlicks Gateway")

# ---------------------------------------------------------------- configuration

NVR_HOST = os.environ.get("NVR_HOST", "192.168.1.245")
NVR_PORT = int(os.environ.get("NVR_RTSP_PORT", "554"))
NVR_USER = os.environ.get("NVR_USER", "admin")
NVR_PASSWORD = os.environ.get("NVR_PASSWORD", "Chand@12345")
API_KEY = (
    os.environ.get("FINAL_SETUP_API_KEY")
    or os.environ.get("PI_API_KEY")
    or "9d6bdf976525e1641b6162ebd6c5d13ff9ee13345e7d6cfcd702b18293ebadfd"
)

# sub = 704x576 HEVC, main = 3840x2160 HEVC
QUALITY = os.environ.get("LIVE_QUALITY", "sub")
# transcode -> H.264/AAC (Mux-compatible). copy -> pass HEVC through untouched.
MODE = os.environ.get("LIVE_MODE", "transcode")
VIDEO_BITRATE = os.environ.get("LIVE_VIDEO_BITRATE", "1200k")

LOG_DIR = Path(os.environ.get("LIVE_LOG_DIR", str(Path.home() / ".final_setup")))
LOG_DIR.mkdir(parents=True, exist_ok=True)

_SUBTYPE = {"main": 0, "sub": 1}
MAX_RESTARTS = int(os.environ.get("LIVE_MAX_RESTARTS", "5"))
HEALTHY_AFTER_SECONDS = 60.0
IST = zoneinfo.ZoneInfo("Asia/Kolkata")


# ---------------------------------------------------------------------- models


class StartRequest(BaseModel):
    channel: int = 1
    rtmpUrl: str


class StopRequest(BaseModel):
    channel: int | None = None


class ExtractRequest(BaseModel):
    recordingId: str
    channel: int = 1
    startTime: str
    endTime: str
    uploadUrl: str
    s3Key: str | None = None


# ------------------------------------------------------------------ the streams


class Stream:
    """One supervised FFmpeg pushing one camera at one ingest URL."""

    def __init__(self, channel: int, rtmp_url: str) -> None:
        self.channel = channel
        self.rtmp_url = rtmp_url
        self.log_path = LOG_DIR / f"channel-{channel}.log"
        self.proc: subprocess.Popen[bytes] | None = None
        self.started_at = 0.0
        self.restarts = 0
        self.last_error: str | None = None
        self.stopping = False
        self._thread: threading.Thread | None = None

    def rtsp_url(self) -> str:
        user = quote(NVR_USER, safe="")
        password = quote(NVR_PASSWORD, safe="")
        subtype = _SUBTYPE.get(QUALITY, 1)
        return (
            f"rtsp://{user}:{password}@{NVR_HOST}:{NVR_PORT}"
            f"/cam/realmonitor?channel={self.channel}&subtype={subtype}"
        )

    def command(self) -> list[str]:
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "warning",
            "-rtsp_transport", "tcp",
            "-i", self.rtsp_url(),
        ]
        if MODE == "transcode":
            cmd += [
                "-f", "lavfi",
                "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-tune", "zerolatency",
                "-b:v", VIDEO_BITRATE,
                "-g", "40",
                "-c:a", "aac", "-b:a", "64k",
            ]
        else:
            cmd += ["-c:v", "copy", "-c:a", "aac"]
        cmd += ["-f", "flv", self.rtmp_url]
        return cmd

    def safe_command(self) -> str:
        redacted = []
        for part in self.command():
            if part == self.rtmp_url:
                base = part.split("?")[0].rsplit("/", 1)[0]
                redacted.append(f"{base}/<stream-key>")
            elif part.startswith("rtsp://"):
                redacted.append(f"rtsp://<credentials>@{NVR_HOST}:{NVR_PORT}/...")
            else:
                redacted.append(part)
        return shlex.join(redacted)

    def start(self) -> None:
        log = open(self.log_path, "ab", buffering=0)
        log.write(
            f"\n=== start channel {self.channel} at {time.strftime('%F %T')} ===\n"
            f"{self.safe_command()}\n".encode()
        )
        self.proc = subprocess.Popen(
            self.command(),
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=log,
            start_new_session=True,
        )
        self.started_at = time.time()
        self._thread = threading.Thread(target=self._supervise, daemon=True)
        self._thread.start()

    def _supervise(self) -> None:
        while not self.stopping:
            proc = self.proc
            if proc is None:
                return
            code = proc.wait()
            if self.stopping:
                return
            uptime = time.time() - self.started_at
            if uptime >= HEALTHY_AFTER_SECONDS:
                self.restarts = 0
            self.last_error = (
                f"exited with code {code} after {uptime:.0f}s; "
                f"see {self.log_path}"
            )
            if self.restarts >= MAX_RESTARTS:
                self.proc = None
                return
            self.restarts += 1
            time.sleep(min(2 ** self.restarts, 30))
            if self.stopping:
                return
            self.start()
            return

    def stop(self, timeout: float = 5.0) -> None:
        self.stopping = True
        proc = self.proc
        if proc is None:
            return
        proc.terminate()
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                proc.kill()
            proc.wait(timeout=timeout)
        self.proc = None

    def alive(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def status(self) -> dict[str, Any]:
        tail = ""
        if self.log_path.exists():
            with open(self.log_path, "rb") as handle:
                tail = handle.read()[-800:].decode("utf-8", "replace")
        return {
            "channel": self.channel,
            "live": self.alive(),
            "quality": QUALITY,
            "mode": MODE,
            "uptimeSeconds": (
                round(time.time() - self.started_at, 1) if self.alive() else 0
            ),
            "restarts": self.restarts,
            "lastError": self.last_error,
            "logTail": tail.strip().splitlines()[-5:],
        }


_streams: dict[int, Stream] = {}
_lock = threading.Lock()


def _require_key(provided: str | None) -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail="API_KEY is not configured; refusing to run open.",
        )
    if provided != API_KEY:
        raise HTTPException(status_code=401, detail="Bad or missing X-API-KEY.")


def format_iso_to_nvr_time(iso_str: str) -> str:
    dt_utc = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    dt_ist = dt_utc.astimezone(IST)
    return dt_ist.strftime("%Y_%m_%d_%H_%M_%S")


# ------------------------------------------------------------------- endpoints


@app.post("/start-live-stream")
def start_live_stream(req: StartRequest, x_api_key: str | None = Header(default=None)):
    _require_key(x_api_key)
    if not req.rtmpUrl.startswith(("rtmp://", "rtmps://", "srt://")):
        raise HTTPException(status_code=400, detail="rtmpUrl must be rtmp/rtmps/srt.")
    with _lock:
        existing = _streams.get(req.channel)
        if existing and existing.alive():
            raise HTTPException(
                status_code=409,
                detail=f"Channel {req.channel} is already live. Stop it first.",
            )
        stream = Stream(req.channel, req.rtmpUrl)
        stream.start()
        _streams[req.channel] = stream
    return {"status": "LIVE_STREAM_STARTED", "channel": req.channel}


@app.post("/stop-live-stream")
def stop_live_stream(
    req: StopRequest | None = None,
    x_api_key: str | None = Header(default=None),
):
    _require_key(x_api_key)
    channel = req.channel if req else None
    with _lock:
        if channel is None:
            stopped = sorted(_streams)
            for stream in list(_streams.values()):
                stream.stop()
            _streams.clear()
        else:
            stream = _streams.pop(channel, None)
            if stream is None:
                raise HTTPException(
                    status_code=404, detail=f"Channel {channel} is not streaming."
                )
            stream.stop()
            stopped = [channel]
    return {"status": "LIVE_STREAM_STOPPED", "channels": stopped}


@app.post("/extract-session")
def extract_session(
    req: ExtractRequest,
    x_api_key: str | None = Header(default=None),
):
    _require_key(x_api_key)
    start_nvr = format_iso_to_nvr_time(req.startTime)
    end_nvr = format_iso_to_nvr_time(req.endTime)
    tmp_file = f"/tmp/{req.recordingId}.mp4"

    user = quote(NVR_USER, safe="")
    password = quote(NVR_PASSWORD, safe="")
    rtsp_playback_url = (
        f"rtsp://{user}:{password}@{NVR_HOST}:{NVR_PORT}/cam/playback"
        f"?channel={req.channel}&starttime={start_nvr}&endtime={end_nvr}"
    )

    cmd = [
        "ffmpeg", "-y",
        "-rtsp_transport", "tcp",
        "-i", rtsp_playback_url,
        "-c", "copy",
        "-movflags", "+faststart",
        tmp_file,
    ]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0 or not os.path.exists(tmp_file):
        error_log = result.stderr.decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=500,
            detail=f"FFmpeg extraction failed: {error_log[-300:]}",
        )

    file_size_bytes = os.path.getsize(tmp_file)

    try:
        with open(tmp_file, "rb") as f:
            upload_res = requests.put(
                req.uploadUrl,
                data=f,
                headers={"Content-Type": "video/mp4"},
                timeout=300,
            )
        if upload_res.status_code not in (200, 204):
            raise HTTPException(
                status_code=500,
                detail=f"S3 Upload failed (HTTP {upload_res.status_code})",
            )
    finally:
        if os.path.exists(tmp_file):
            os.remove(tmp_file)

    return {
        "status": "SUCCESS",
        "recordingId": req.recordingId,
        "s3Key": req.s3Key,
        "fileSizeBytes": file_size_bytes,
    }


@app.get("/live-stream-status")
def live_stream_status(x_api_key: str | None = Header(default=None)):
    _require_key(x_api_key)
    with _lock:
        streams = [stream.status() for _, stream in sorted(_streams.items())]
    return {
        "publishing": any(s["live"] for s in streams),
        "streams": streams,
    }


@app.get("/health")
def health():
    return {"status": "OK"}


# ----------------------------------------------------------------- entrypoint
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

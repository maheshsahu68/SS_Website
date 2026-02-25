# Server setup (open-source only)

This backend runs fully with local/open-source processing:

- **Transcription**: `whisper.cpp` CLI (local model, no cloud API)
- **Summarization**: local extractive summarizer (no paid LLM usage)

## Requirements

- Node.js 18+
- MongoDB running (`MONGODB_URI`)
- `ffmpeg` available on PATH (or set `FFMPEG_PATH`)
- `whisper.cpp` binary available as `whisper-cli` (or set `WHISPER_CPP_BIN`)
- A local Whisper model file (set `WHISPER_CPP_MODEL`)

## Environment variables

Copy `.env.example` to `.env` and edit values:

```bash
cp .env.example .env
```

Example:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/sonicsearch
WHISPER_CPP_MODEL=/absolute/path/to/ggml-base.en.bin
# optional:
# WHISPER_CPP_BIN=/absolute/path/to/whisper-cli
# FFMPEG_PATH=/absolute/path/to/ffmpeg
# PORT=5000
```

## Run

```bash
npm install
npm start
```

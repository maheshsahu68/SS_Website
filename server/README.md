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
# WHISPER_CPP_MODEL_HI=/absolute/path/to/multilingual-model.bin
# FFMPEG_PATH=/absolute/path/to/ffmpeg
# PORT=5000
# JWT_SECRET=sonicsearchsupersecure2026
# GOOGLE_CLIENT_ID=309276754683-5oaskor4cp6hs8i0o2so994a7al78vc3.apps.googleusercontent.com
# CLIENT_ORIGIN=http://localhost:5173
```

## Run

```bash
npm install
npm start
```


## YouTube links

The server prefers open-source `yt-dlp` (if installed) for better YouTube compatibility and falls back to `ytdl-core`.


### Google sign-in

To make Google sign-in work:

- Create a Web OAuth client in Google Cloud Console.
- Add `http://localhost:5173` to Authorized JavaScript origins.
- Set `GOOGLE_CLIENT_ID` in `server/.env` to that exact client ID.
- Set `VITE_GOOGLE_CLIENT_ID` in `client/.env` to the same client ID.
- Restart both backend and frontend.


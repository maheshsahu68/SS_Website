# SonicSearch (Local / Open-Source Setup)

SonicSearch lets you upload audio/video (or a YouTube link), transcribe it locally with `whisper.cpp`, search transcript timestamps, and generate a local summary. It supports auto, English, and Hindi transcription selection from the UI.

## Project structure

- `server/` → Express + MongoDB API
- `client/` → React + Vite frontend

## Prerequisites

1. **Node.js 18+**
2. **MongoDB** running locally (or a remote Mongo URI)
3. **ffmpeg** available on your PATH
4. **whisper.cpp** CLI binary + model file

---

## 1) Setup whisper.cpp

You need:

- a Whisper model file (for Hindi/multilingual use a non-`.en` model such as `ggml-base.bin`)
- the CLI executable (`whisper-cli`)

If `whisper-cli` is not on PATH, use `WHISPER_CPP_BIN` to point to the executable directly.

---

## 2) Configure backend env

Create `server/.env`:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/sonicsearch
WHISPER_CPP_MODEL=/absolute/path/to/ggml-base.en.bin

# Optional
# WHISPER_CPP_BIN=/absolute/path/to/whisper-cli
# WHISPER_CPP_MODEL_HI=/absolute/path/to/multilingual-model.bin
# FFMPEG_PATH=/absolute/path/to/ffmpeg
# PORT=5000
```

> On Windows, use full paths like `C:/...`.

---

## 3) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

---

## 4) Run the app

Open two terminals.

### Terminal A (Backend)

```bash
cd server
npm start
```

Backend runs at: `http://localhost:5000`

### Terminal B (Frontend)

```bash
cd client
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 5) Verify everything works

### Backend checks

```bash
cd server
npm test
node --check server.js
```

### Frontend checks

```bash
cd client
npm run lint
npm run build
```

---

## Notes / troubleshooting

- If upload/transcription fails immediately, confirm `WHISPER_CPP_MODEL` points to a real model file.
- If error says `whisper-cli` not found, set `WHISPER_CPP_BIN`.
- If Hindi transcription fails with a model error, set `WHISPER_CPP_MODEL_HI` to a multilingual model (not `*.en`).
- For more reliable YouTube downloads, install open-source `yt-dlp` (the server will auto-use it when available).
- If video/audio extraction fails, check `ffmpeg` installation or set `FFMPEG_PATH`.
- If DB calls fail, make sure MongoDB is running and `MONGODB_URI` is correct.

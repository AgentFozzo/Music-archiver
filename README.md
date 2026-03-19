# Music Archiver

A self-hosted music server with an Apple Music-inspired web UI. Runs in Docker — designed for Unraid but works anywhere.

## Features

- Streams all major audio formats: MP3, FLAC, AAC, M4A, OGG, WAV, OPUS, WMA, APE, AIFF
- Automatic metadata extraction from audio tags (ID3v2, Vorbis, MP4, FLAC)
- Online enrichment via MusicBrainz (album art, genre, release year) and Last.fm (artist bios, similar artists)
- Auto-grouped by artist, album, and genre
- Recommendation engine based on listening history
- Shuffle and repeat modes
- Playlist creation and management
- Apple Music-inspired responsive UI (desktop, tablet, mobile)
- Watches music directory for new files automatically

---

## Quick Start with Docker Compose

### 1. Clone and configure

```bash
git clone <repo>
cd Music-archiver
cp .env.example .env
# Optional: add your Last.fm API key to .env
```

### 2. Edit `docker-compose.yml` for your paths

```yaml
volumes:
  - /path/to/your/music:/music:ro
  - /path/to/appdata/db:/data
  - /path/to/appdata/artwork:/artwork
```

### 3. Build and run

```bash
docker compose up --build -d
```

Open http://localhost:3000 in your browser. The library will scan automatically on startup.

---

## Unraid Setup

1. In Unraid, go to **Docker** → **Add Container** or use the **docker-compose** plugin
2. Set the following volume mappings:
   - `/mnt/user/Music` → `/music` (read-only)
   - `/mnt/user/appdata/music-archiver/db` → `/data`
   - `/mnt/user/appdata/music-archiver/artwork` → `/artwork`
3. Map port `3000` → `3000`
4. Set environment variables as needed
5. Start the container — it will scan your library on first boot

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MUSIC_DIR` | `/music` | Path to your music files inside the container |
| `DB_PATH` | `/data/music.db` | SQLite database location |
| `ARTWORK_DIR` | `/artwork` | Cached album art location |
| `PORT` | `3000` | Web server port |
| `LASTFM_API_KEY` | (empty) | Optional Last.fm API key for artist bios & similar artists |

---

## Getting a Last.fm API Key (Optional)

1. Create an account at https://www.last.fm
2. Go to https://www.last.fm/api/account/create
3. Fill in the application form (any name/description)
4. Copy your API key and set `LASTFM_API_KEY` in your environment

Without a Last.fm key, the app still works — it just won't fetch artist bios or similar artist data.

---

## Supported Audio Formats

MP3, FLAC, AAC, M4A, OGG, WAV, OPUS, WMA, APE, ALAC, AIFF, AIF, DSF, DFF, MPC, WV, TTA

---

## Development

### Prerequisites
- Node.js 20+
- npm

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with local paths
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend Vite dev server proxies `/api` to the backend on port 3000.

### Building for production
```bash
cd frontend && npm run build  # outputs to backend/public/
cd backend && npm run build   # compiles TypeScript
```

---

## Architecture

```
music-archiver/
├── backend/          # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── database/ # SQLite schema and connection
│   │   ├── routes/   # REST API endpoints
│   │   └── services/ # Scanner, metadata, recommendations
│   └── public/       # Built frontend (served as static)
├── frontend/         # React + TypeScript + Vite
│   └── src/
│       ├── components/  # UI components (Apple Music style)
│       ├── store/       # Zustand player state
│       ├── hooks/       # useAudio, useAudioSeek
│       └── api/         # Backend API client
├── Dockerfile        # Multi-stage build
└── docker-compose.yml
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/tracks` | List all tracks |
| GET | `/api/tracks/:id` | Get track metadata |
| GET | `/api/stream/:id` | Stream audio (range requests) |
| GET | `/api/albums` | List all albums |
| GET | `/api/albums/:id` | Album with tracks |
| GET | `/api/artists` | List all artists |
| GET | `/api/artists/:id` | Artist with albums and tracks |
| GET | `/api/artwork/album/:id` | Album artwork |
| GET | `/api/search?q=` | Search everything |
| GET | `/api/recommendations` | Personalized recommendations |
| POST | `/api/history` | Record a play event |
| POST | `/api/scan` | Trigger library rescan |
| GET | `/api/playlists` | List playlists |
| POST | `/api/playlists` | Create playlist |

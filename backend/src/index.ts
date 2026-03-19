import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './database/db';
import { runFullScan, startWatcher } from './services/scanner';

import tracksRouter from './routes/tracks';
import albumsRouter from './routes/albums';
import artistsRouter from './routes/artists';
import streamRouter from './routes/stream';
import artworkRouter from './routes/artwork';
import searchRouter from './routes/search';
import recommendationsRouter from './routes/recommendations';
import historyRouter from './routes/history';
import scannerRouter from './routes/scanner';
import playlistsRouter from './routes/playlists';
import settingsRouter from './routes/settings';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const MUSIC_DIR = process.env.MUSIC_DIR || '/music';
const DB_PATH = process.env.DB_PATH || '/data/music.db';
const ARTWORK_DIR = process.env.ARTWORK_DIR || '/artwork';

// Initialize database
initDb(DB_PATH);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// API routes
app.use('/api/tracks', tracksRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/stream', streamRouter);
app.use('/api/artwork', artworkRouter);
app.use('/api/search', searchRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/history', historyRouter);
app.use('/api/scan', scannerRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/settings', settingsRouter);

// Serve frontend static files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Music Archiver running on http://0.0.0.0:${PORT}`);

  // Initial scan + start watcher
  runFullScan(MUSIC_DIR, ARTWORK_DIR)
    .then(count => console.log(`Initial scan complete: ${count} files`))
    .catch(err => console.error('Initial scan error:', err));

  startWatcher(MUSIC_DIR, ARTWORK_DIR);
});

export default app;

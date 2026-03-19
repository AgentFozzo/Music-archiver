import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../database/db';

const router = Router();

// GET /api/artwork/album/:id
router.get('/album/:id', (req: Request, res: Response) => {
  const db = getDb();

  const album = db.prepare('SELECT artwork_path FROM albums WHERE id = ?').get(req.params.id) as
    | { artwork_path: string | null }
    | undefined;

  if (!album?.artwork_path || !fs.existsSync(album.artwork_path)) {
    return res.status(404).json({ error: 'Artwork not found' });
  }

  const ext = path.extname(album.artwork_path).slice(1).toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(album.artwork_path).pipe(res);
});

// GET /api/artwork/track/:id — resolves via the track's album
router.get('/track/:id', (req: Request, res: Response) => {
  const db = getDb();

  const track = db.prepare(`
    SELECT al.artwork_path
    FROM tracks t
    LEFT JOIN albums al ON al.id = t.album_id
    WHERE t.id = ?
  `).get(req.params.id) as { artwork_path: string | null } | undefined;

  if (!track?.artwork_path || !fs.existsSync(track.artwork_path)) {
    return res.status(404).json({ error: 'Artwork not found' });
  }

  const ext = path.extname(track.artwork_path).slice(1).toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(track.artwork_path).pipe(res);
});

export default router;

import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

// POST /api/history — record a play event
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { trackId, durationPlayed } = req.body as { trackId?: string; durationPlayed?: number };

  if (!trackId) return res.status(400).json({ error: 'trackId required' });

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  db.prepare(
    'INSERT INTO play_history (track_id, duration_played) VALUES (?, ?)'
  ).run(trackId, durationPlayed ?? null);

  db.prepare(
    'UPDATE tracks SET play_count = play_count + 1 WHERE id = ?'
  ).run(trackId);

  res.json({ ok: true });
});

// GET /api/history — recent play history
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { limit = '50' } = req.query as Record<string, string>;

  const history = db.prepare(`
    SELECT ph.id, ph.played_at, ph.duration_played,
           t.id as track_id, t.title, t.duration,
           ar.name as artist_name, al.title as album_title, al.artwork_path
    FROM play_history ph
    JOIN tracks t ON t.id = ph.track_id
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
    ORDER BY ph.played_at DESC
    LIMIT ?
  `).all(parseInt(limit));

  res.json({ history });
});

export default router;

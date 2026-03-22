import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const playlists = db.prepare(`
    SELECT pl.id, pl.name, pl.description, pl.created_at, pl.updated_at,
           COUNT(pt.track_id) as track_count
    FROM playlists pl
    LEFT JOIN playlist_tracks pt ON pt.playlist_id = pl.id
    GROUP BY pl.id
    ORDER BY pl.updated_at DESC
  `).all();
  res.json({ playlists });
});

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = uuidv4();
  db.prepare('INSERT INTO playlists (id, name, description) VALUES (?, ?, ?)').run(id, name, description ?? null);
  res.status(201).json({ id, name, description });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const tracks = db.prepare(`
    SELECT t.id, t.title, t.duration, t.track_number, pt.position,
           ar.name as artist_name, al.title as album_title, al.artwork_path
    FROM playlist_tracks pt
    JOIN tracks t ON t.id = pt.track_id
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
    WHERE pt.playlist_id = ?
    ORDER BY pt.position ASC
  `).all(req.params.id);

  res.json({ ...playlist as object, tracks });
});

router.post('/:id/tracks', (req: Request, res: Response) => {
  const db = getDb();
  const { trackId } = req.body as { trackId?: string };
  if (!trackId) return res.status(400).json({ error: 'trackId required' });

  const maxPos = (db.prepare(
    'SELECT MAX(position) as max FROM playlist_tracks WHERE playlist_id = ?'
  ).get(req.params.id) as { max: number | null }).max ?? 0;

  db.prepare(
    'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)'
  ).run(req.params.id, trackId, maxPos + 1);

  db.prepare('UPDATE playlists SET updated_at = unixepoch() WHERE id = ?').run(req.params.id);

  res.json({ ok: true });
});

router.delete('/:id/tracks/:trackId', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(req.params.id, req.params.trackId);
  db.prepare('UPDATE playlists SET updated_at = unixepoch() WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name) return res.status(400).json({ error: 'name required' });
  db.prepare('UPDATE playlists SET name = ?, description = ?, updated_at = unixepoch() WHERE id = ?')
    .run(name.trim(), description ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

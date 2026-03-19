import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { sort = 'title', order = 'asc', artist } = req.query as Record<string, string>;

  const validSorts: Record<string, string> = {
    title: 'al.title',
    year: 'al.year',
    artist: 'ar.name',
    created_at: 'al.created_at',
  };

  const sortCol = validSorts[sort] ?? 'al.title';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (artist) { conditions.push('al.artist_id = ?'); params.push(artist); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const albums = db.prepare(`
    SELECT al.id, al.title, al.year, al.genre, al.artwork_path,
           al.total_tracks, al.musicbrainz_id, al.created_at,
           ar.id as artist_id, ar.name as artist_name
    FROM albums al
    LEFT JOIN artists ar ON ar.id = al.artist_id
    ${where}
    ORDER BY ${sortCol} ${sortDir}
  `).all(...params);

  res.json({ albums });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();

  const album = db.prepare(`
    SELECT al.*, ar.name as artist_name, ar.id as artist_id
    FROM albums al
    LEFT JOIN artists ar ON ar.id = al.artist_id
    WHERE al.id = ?
  `).get(req.params.id);

  if (!album) return res.status(404).json({ error: 'Album not found' });

  const tracks = db.prepare(`
    SELECT t.id, t.title, t.duration, t.track_number, t.disc_number,
           t.genre, t.year, t.bitrate, t.format, t.play_count,
           ar.id as artist_id, ar.name as artist_name
    FROM tracks t
    LEFT JOIN artists ar ON ar.id = t.artist_id
    WHERE t.album_id = ?
    ORDER BY t.disc_number ASC, t.track_number ASC, t.title ASC
  `).all(req.params.id);

  res.json({ ...album as object, tracks });
});

export default router;

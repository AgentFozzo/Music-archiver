import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { sort = 'title', order = 'asc', artist, album, genre, limit = '500', offset = '0' } = req.query as Record<string, string>;

  const validSorts: Record<string, string> = {
    title: 't.title',
    artist: 'ar.name',
    album: 'al.title',
    year: 't.year',
    duration: 't.duration',
    play_count: 't.play_count',
    created_at: 't.created_at',
    track_number: 't.track_number',
  };

  const sortCol = validSorts[sort] ?? 't.title';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (artist) { conditions.push('t.artist_id = ?'); params.push(artist); }
  if (album) { conditions.push('t.album_id = ?'); params.push(album); }
  if (genre) { conditions.push('t.genre = ?'); params.push(genre); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const tracks = db.prepare(`
    SELECT t.id, t.title, t.duration, t.track_number, t.disc_number,
           t.genre, t.year, t.bitrate, t.sample_rate, t.format,
           t.file_size, t.play_count, t.created_at,
           ar.id as artist_id, ar.name as artist_name,
           al.id as album_id, al.title as album_title, al.artwork_path
    FROM tracks t
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
    ${where}
    ORDER BY ${sortCol} ${sortDir}, t.disc_number ASC, t.track_number ASC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM tracks t ${where}`).get(...params) as { cnt: number }).cnt;

  res.json({ tracks, total, limit: parseInt(limit), offset: parseInt(offset) });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const track = db.prepare(`
    SELECT t.*, ar.name as artist_name, al.title as album_title, al.artwork_path
    FROM tracks t
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!track) return res.status(404).json({ error: 'Track not found' });
  res.json(track);
});

export default router;

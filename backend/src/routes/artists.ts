import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { sort = 'name', order = 'asc' } = req.query as Record<string, string>;

  const validSorts: Record<string, string> = {
    name: 'ar.name',
    created_at: 'ar.created_at',
  };

  const sortCol = validSorts[sort] ?? 'ar.name';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const artists = db.prepare(`
    SELECT ar.id, ar.name, ar.image_url, ar.bio, ar.musicbrainz_id,
           COUNT(DISTINCT al.id) as album_count,
           COUNT(DISTINCT t.id) as track_count
    FROM artists ar
    LEFT JOIN albums al ON al.artist_id = ar.id
    LEFT JOIN tracks t ON t.artist_id = ar.id
    GROUP BY ar.id
    ORDER BY ${sortCol} ${sortDir}
  `).all();

  res.json({ artists });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();

  const artist = db.prepare(`
    SELECT ar.id, ar.name, ar.image_url, ar.bio, ar.musicbrainz_id
    FROM artists ar
    WHERE ar.id = ?
  `).get(req.params.id);

  if (!artist) return res.status(404).json({ error: 'Artist not found' });

  const albums = db.prepare(`
    SELECT al.id, al.title, al.year, al.genre, al.artwork_path, al.total_tracks
    FROM albums al
    WHERE al.artist_id = ?
    ORDER BY al.year DESC, al.title ASC
  `).all(req.params.id);

  const tracks = db.prepare(`
    SELECT t.id, t.title, t.duration, t.track_number, t.album_id,
           al.title as album_title, al.artwork_path
    FROM tracks t
    LEFT JOIN albums al ON al.id = t.album_id
    WHERE t.artist_id = ?
    ORDER BY al.year DESC, t.disc_number ASC, t.track_number ASC
    LIMIT 200
  `).all(req.params.id);

  res.json({ ...artist as object, albums, tracks });
});

export default router;

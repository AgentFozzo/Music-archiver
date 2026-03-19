import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const q = (req.query.q as string | undefined)?.trim();

  if (!q || q.length < 1) {
    return res.json({ tracks: [], albums: [], artists: [] });
  }

  const like = `%${q}%`;

  const tracks = db.prepare(`
    SELECT t.id, t.title, t.duration, t.track_number,
           ar.id as artist_id, ar.name as artist_name,
           al.id as album_id, al.title as album_title, al.artwork_path
    FROM tracks t
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
    WHERE t.title LIKE ? OR ar.name LIKE ? OR al.title LIKE ?
    ORDER BY t.title ASC
    LIMIT 30
  `).all(like, like, like);

  const albums = db.prepare(`
    SELECT al.id, al.title, al.year, al.genre, al.artwork_path, al.total_tracks,
           ar.id as artist_id, ar.name as artist_name
    FROM albums al
    LEFT JOIN artists ar ON ar.id = al.artist_id
    WHERE al.title LIKE ? OR ar.name LIKE ?
    ORDER BY al.title ASC
    LIMIT 20
  `).all(like, like);

  const artists = db.prepare(`
    SELECT ar.id, ar.name, ar.image_url,
           COUNT(DISTINCT al.id) as album_count
    FROM artists ar
    LEFT JOIN albums al ON al.artist_id = ar.id
    WHERE ar.name LIKE ?
    GROUP BY ar.id
    ORDER BY ar.name ASC
    LIMIT 10
  `).all(like);

  res.json({ tracks, albums, artists });
});

export default router;

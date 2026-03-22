import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

const TRACK_SELECT = `
  SELECT t.id, t.title, t.duration, t.track_number, t.disc_number,
         t.genre, t.year, t.play_count,
         ar.id as artist_id, ar.name as artist_name,
         al.id as album_id, al.title as album_title, al.artwork_path
  FROM tracks t
  LEFT JOIN artists ar ON ar.id = t.artist_id
  LEFT JOIN albums al ON al.id = t.album_id
`;

/**
 * GET /api/radio
 * Query params:
 *   seed    — track ID to base genre on
 *   genre   — genre string (overrides seed lookup)
 *   artist  — artist ID to use instead of genre
 *   limit   — max tracks to return (default 40)
 *
 * Strategy:
 *  1. Exact genre match
 *  2. Fuzzy genre match (same base word)
 *  3. Same artist fallback
 *  4. Random fallback
 */
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { seed, artist, limit = '40' } = req.query as Record<string, string>;
  let { genre } = req.query as Record<string, string>;
  const n = Math.min(parseInt(limit) || 40, 100);

  // Resolve genre from seed track
  if (seed && !genre) {
    const seedTrack = db.prepare('SELECT genre, artist_id FROM tracks WHERE id = ?').get(seed) as
      { genre: string | null; artist_id: string | null } | undefined;
    if (seedTrack?.genre) genre = seedTrack.genre;
  }

  let tracks: unknown[] = [];
  let resolvedGenre: string | null = genre ?? null;

  if (genre) {
    // 1. Exact genre match
    tracks = db.prepare(`${TRACK_SELECT} WHERE LOWER(t.genre) = LOWER(?) AND t.id != COALESCE(?, '') ORDER BY RANDOM() LIMIT ?`)
      .all(genre, seed ?? null, n);

    // 2. Fuzzy: same genre "family" (e.g. "Rock" matches "Alternative Rock")
    if (tracks.length < 10) {
      const base = genre.split(/\s+/).pop() ?? genre; // last word of genre
      tracks = db.prepare(`${TRACK_SELECT} WHERE LOWER(t.genre) LIKE LOWER(?) AND t.id != COALESCE(?, '') ORDER BY RANDOM() LIMIT ?`)
        .all(`%${base}%`, seed ?? null, n);
    }
  }

  // 3. Artist fallback
  if (tracks.length < 5) {
    const artistId = artist ?? (seed
      ? (db.prepare('SELECT artist_id FROM tracks WHERE id = ?').get(seed) as { artist_id: string | null } | undefined)?.artist_id
      : null);
    if (artistId) {
      tracks = db.prepare(`${TRACK_SELECT} WHERE t.artist_id = ? AND t.id != COALESCE(?, '') ORDER BY RANDOM() LIMIT ?`)
        .all(artistId, seed ?? null, n);
      resolvedGenre = null; // genre label wouldn't be accurate
    }
  }

  // 4. Pure random fallback
  if (tracks.length < 5) {
    tracks = db.prepare(`${TRACK_SELECT} WHERE t.id != COALESCE(?, '') ORDER BY RANDOM() LIMIT ?`)
      .all(seed ?? null, n);
    resolvedGenre = null;
  }

  res.json({ tracks, genre: resolvedGenre });
});

export default router;

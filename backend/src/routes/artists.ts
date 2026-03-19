import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { fetchArtistBioFromLastFm } from '../services/musicbrainz';
import { extractPrimaryArtist } from '../services/localMetadata';

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

// Merge compound artist records (e.g. "Artist feat. X", "Artist; X") into their primary artist
router.post('/normalize', (req: Request, res: Response) => {
  const db = getDb();

  const compounds = db.prepare(`
    SELECT id, name FROM artists
    WHERE name LIKE '%;%'
       OR name LIKE '%feat.%'
       OR name LIKE '%feat %'
       OR name LIKE '%ft.%'
       OR name LIKE '%featuring %'
  `).all() as Array<{ id: string; name: string }>;

  let merged = 0;

  for (const compound of compounds) {
    const primaryName = extractPrimaryArtist(compound.name);
    if (primaryName === compound.name) continue;

    let primary = db.prepare('SELECT id FROM artists WHERE name = ?').get(primaryName) as { id: string } | undefined;
    if (!primary) {
      const newId = uuidv4();
      db.prepare('INSERT INTO artists (id, name) VALUES (?, ?)').run(newId, primaryName);
      primary = { id: newId };
    }

    db.prepare('UPDATE tracks SET artist_id = ? WHERE artist_id = ?').run(primary.id, compound.id);
    db.prepare('UPDATE albums SET artist_id = ? WHERE artist_id = ?').run(primary.id, compound.id);
    db.prepare('DELETE FROM artists WHERE id = ?').run(compound.id);
    merged++;
  }

  // Recompute album counts
  db.prepare(`
    UPDATE albums SET total_tracks = (SELECT COUNT(*) FROM tracks WHERE album_id = albums.id)
  `).run();

  res.json({ merged });
});

// Fetch Last.fm bio + image for artists missing metadata
router.post('/fetch-metadata', async (req: Request, res: Response) => {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'LASTFM_API_KEY not configured' });

  const db = getDb();
  const artists = db.prepare(
    'SELECT id, name FROM artists WHERE bio IS NULL OR image_url IS NULL LIMIT 100'
  ).all() as Array<{ id: string; name: string }>;

  res.json({ queued: artists.length });

  // Run in background after responding
  (async () => {
    for (const artist of artists) {
      try {
        await fetchArtistBioFromLastFm(artist.id, artist.name, apiKey);
        await new Promise(r => setTimeout(r, 250));
      } catch { /* ignore individual failures */ }
    }
    console.log(`Artist metadata fetch complete: ${artists.length} artists processed`);
  })();
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

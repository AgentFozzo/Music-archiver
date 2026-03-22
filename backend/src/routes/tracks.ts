import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

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

// PUT /api/tracks/:id — edit track metadata
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { title, artist_name, album_title, genre, year, track_number, disc_number } =
    req.body as Record<string, string | number | null | undefined>;

  const existing = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) return res.status(404).json({ error: 'Track not found' });

  // Resolve artist — find existing or create new
  let artistId = existing.artist_id as string | null;
  if (artist_name !== undefined) {
    const name = typeof artist_name === 'string' ? artist_name.trim() : null;
    if (name) {
      const found = db.prepare('SELECT id FROM artists WHERE LOWER(name) = LOWER(?)').get(name) as { id: string } | undefined;
      if (found) {
        artistId = found.id;
      } else {
        artistId = uuidv4();
        db.prepare('INSERT INTO artists (id, name) VALUES (?, ?)').run(artistId, name);
      }
    } else {
      artistId = null;
    }
  }

  // Resolve album — find existing (same title + artist) or create new
  let albumId = existing.album_id as string | null;
  if (album_title !== undefined) {
    const aTitle = typeof album_title === 'string' ? album_title.trim() : null;
    if (aTitle) {
      const found = db.prepare(
        'SELECT id FROM albums WHERE LOWER(title) = LOWER(?) AND (artist_id = ? OR artist_id IS NULL OR ? IS NULL)'
      ).get(aTitle, artistId, artistId) as { id: string } | undefined;
      if (found) {
        albumId = found.id;
      } else {
        albumId = uuidv4();
        db.prepare('INSERT INTO albums (id, title, artist_id) VALUES (?, ?, ?)').run(albumId, aTitle, artistId);
      }
    } else {
      albumId = null;
    }
  }

  db.prepare(`
    UPDATE tracks SET
      title        = ?,
      artist_id    = ?,
      album_id     = ?,
      genre        = ?,
      year         = ?,
      track_number = ?,
      disc_number  = ?
    WHERE id = ?
  `).run(
    title !== undefined ? String(title).trim() : existing.title,
    artistId,
    albumId,
    genre  !== undefined ? genre  : existing.genre,
    year   !== undefined ? year   : existing.year,
    track_number !== undefined ? track_number : existing.track_number,
    disc_number  !== undefined ? disc_number  : existing.disc_number,
    req.params.id,
  );

  const updated = db.prepare(`
    SELECT t.*, ar.name as artist_name, al.title as album_title, al.artwork_path
    FROM tracks t
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

export default router;

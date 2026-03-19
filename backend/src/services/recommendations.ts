import { getDb } from '../database/db';

interface Track {
  id: string;
  title: string;
  artist_id: string | null;
  album_id: string | null;
  genre: string | null;
  duration: number | null;
  play_count: number;
  artist_name: string | null;
  album_title: string | null;
  artwork_path: string | null;
  track_number: number | null;
  year: number | null;
  format: string | null;
}

export function getRecommendations(limit: number = 20): Track[] {
  const db = getDb();

  // Get recently played tracks (last 50 plays)
  const recentPlays = db.prepare(`
    SELECT t.artist_id, t.album_id, t.genre
    FROM play_history ph
    JOIN tracks t ON t.id = ph.track_id
    ORDER BY ph.played_at DESC
    LIMIT 50
  `).all() as Array<{ artist_id: string | null; album_id: string | null; genre: string | null }>;

  if (recentPlays.length === 0) {
    // No history: return recently added tracks
    return db.prepare(`
      SELECT t.*, ar.name as artist_name, al.title as album_title, al.artwork_path
      FROM tracks t
      LEFT JOIN artists ar ON ar.id = t.artist_id
      LEFT JOIN albums al ON al.id = t.album_id
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(limit) as Track[];
  }

  // Score candidates by genre and artist affinity
  const genreScores = new Map<string, number>();
  const artistScores = new Map<string, number>();
  const recentTrackIds = new Set<string>();

  for (const play of recentPlays) {
    if (play.genre) genreScores.set(play.genre, (genreScores.get(play.genre) ?? 0) + 1);
    if (play.artist_id) artistScores.set(play.artist_id, (artistScores.get(play.artist_id) ?? 0) + 1);
  }

  // Get IDs of recently played tracks to exclude
  const recentIds = db.prepare(`
    SELECT track_id FROM play_history ORDER BY played_at DESC LIMIT 20
  `).all() as Array<{ track_id: string }>;
  recentIds.forEach(r => recentTrackIds.add(r.track_id));

  // Fetch all candidate tracks
  const candidates = db.prepare(`
    SELECT t.*, ar.name as artist_name, al.title as album_title, al.artwork_path
    FROM tracks t
    LEFT JOIN artists ar ON ar.id = t.artist_id
    LEFT JOIN albums al ON al.id = t.album_id
  `).all() as Track[];

  // Score each candidate
  const scored = candidates
    .filter(t => !recentTrackIds.has(t.id))
    .map(t => {
      let score = 0;
      if (t.genre && genreScores.has(t.genre)) score += genreScores.get(t.genre)! * 3;
      if (t.artist_id && artistScores.has(t.artist_id)) score += artistScores.get(t.artist_id)! * 2;
      // Slight boost for tracks never played
      if (t.play_count === 0) score += 1;
      return { track: t, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Math.random() - 0.5; // shuffle within same score
    });

  if (scored.length === 0) {
    // Fallback: random unplayed tracks
    return db.prepare(`
      SELECT t.*, ar.name as artist_name, al.title as album_title, al.artwork_path
      FROM tracks t
      LEFT JOIN artists ar ON ar.id = t.artist_id
      LEFT JOIN albums al ON al.id = t.album_id
      WHERE t.play_count = 0
      ORDER BY RANDOM()
      LIMIT ?
    `).all(limit) as Track[];
  }

  return scored.slice(0, limit).map(s => s.track);
}

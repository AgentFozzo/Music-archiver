import * as mm from 'music-metadata';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.aac', '.m4a', '.ogg', '.wav', '.opus',
  '.wma', '.ape', '.alac', '.aiff', '.aif', '.dsf', '.dff',
  '.mpc', '.wv', '.tta',
]);

export function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function sanitize(str: string | null | undefined): string | null {
  if (!str) return null;
  return str.trim() || null;
}

export function extractPrimaryArtist(raw: string): string {
  // Take first part when separated by semicolons (multi-artist tag separator)
  const primary = raw.split(';')[0].trim();
  // Strip "feat." / "ft." / "featuring" suffixes (with optional parens)
  return primary
    .replace(/\s*[\(\[]?\s*feat(?:uring|\.)\s+.+$/i, '')
    .replace(/\s*[\(\[]?\s*ft\.\s+.+$/i, '')
    .trim() || raw.trim();
}

function getOrCreateArtist(name: string): string {
  const db = getDb();
  const normalized = extractPrimaryArtist(name);

  const existing = db.prepare(
    'SELECT id FROM artists WHERE name = ?'
  ).get(normalized) as { id: string } | undefined;

  if (existing) return existing.id;

  const id = uuidv4();
  db.prepare(
    'INSERT INTO artists (id, name) VALUES (?, ?)'
  ).run(id, normalized);

  return id;
}

function getOrCreateAlbum(
  title: string,
  artistId: string | null,
  year: number | null,
  genre: string | null
): string {
  const db = getDb();
  const normalized = title.trim();

  const existing = db.prepare(
    'SELECT id FROM albums WHERE title = ? AND (artist_id = ? OR (artist_id IS NULL AND ? IS NULL))'
  ).get(normalized, artistId, artistId) as { id: string } | undefined;

  if (existing) return existing.id;

  const id = uuidv4();
  db.prepare(
    'INSERT INTO albums (id, title, artist_id, year, genre) VALUES (?, ?, ?, ?, ?)'
  ).run(id, normalized, artistId, year, genre);

  return id;
}

export async function extractAndSaveArtwork(
  metadata: mm.IAudioMetadata,
  albumId: string,
  artworkDir: string
): Promise<string | null> {
  const picture = metadata.common.picture?.[0];
  if (!picture) return null;

  if (!fs.existsSync(artworkDir)) {
    fs.mkdirSync(artworkDir, { recursive: true });
  }

  const ext = picture.format.includes('png') ? 'png' : 'jpg';
  const artPath = path.join(artworkDir, `${albumId}.${ext}`);

  if (!fs.existsSync(artPath)) {
    fs.writeFileSync(artPath, picture.data);
  }

  return artPath;
}

export async function processAudioFile(
  filePath: string,
  artworkDir: string
): Promise<void> {
  const db = getDb();

  const stat = fs.statSync(filePath);
  const lastModified = Math.floor(stat.mtimeMs / 1000);

  // Check if already indexed and unchanged
  const existing = db.prepare(
    'SELECT id, last_modified FROM tracks WHERE file_path = ?'
  ).get(filePath) as { id: string; last_modified: number } | undefined;

  if (existing && existing.last_modified === lastModified) {
    return; // No change
  }

  let metadata: mm.IAudioMetadata;
  try {
    metadata = await mm.parseFile(filePath, { duration: true, skipCovers: false });
  } catch (err) {
    console.warn(`Failed to parse ${filePath}:`, err);
    return;
  }

  const { common, format } = metadata;

  const artistName = sanitize(common.artist || common.albumartist);
  const albumArtistName = sanitize(common.albumartist || common.artist);
  const albumTitle = sanitize(common.album);
  const title = sanitize(common.title) || path.basename(filePath, path.extname(filePath));
  const genre = sanitize(common.genre?.[0] ?? null);
  const year = common.year ?? null;
  const trackNumber = common.track?.no ?? null;
  const discNumber = common.disk?.no ?? null;
  const duration = format.duration ?? null;
  const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : null;
  const sampleRate = format.sampleRate ?? null;
  const fileFormat = path.extname(filePath).slice(1).toLowerCase();
  const fileSize = stat.size;

  const artistId = artistName ? getOrCreateArtist(artistName) : null;
  const albumArtistId = albumArtistName && albumArtistName !== artistName
    ? getOrCreateArtist(albumArtistName)
    : artistId;

  let albumId: string | null = null;
  if (albumTitle) {
    albumId = getOrCreateAlbum(albumTitle, albumArtistId, year, genre);

    // Extract artwork for the album if not already done
    const album = db.prepare('SELECT artwork_path FROM albums WHERE id = ?').get(albumId) as { artwork_path: string | null } | undefined;
    if (!album?.artwork_path) {
      const artPath = await extractAndSaveArtwork(metadata, albumId, artworkDir);
      if (artPath) {
        db.prepare('UPDATE albums SET artwork_path = ? WHERE id = ?').run(artPath, albumId);
      }
    }
  }

  if (existing) {
    db.prepare(`
      UPDATE tracks SET
        title = ?, artist_id = ?, album_id = ?, album_artist = ?,
        duration = ?, track_number = ?, disc_number = ?, genre = ?,
        year = ?, bitrate = ?, sample_rate = ?, format = ?,
        file_size = ?, last_modified = ?
      WHERE id = ?
    `).run(
      title, artistId, albumId, albumArtistName,
      duration, trackNumber, discNumber, genre,
      year, bitrate, sampleRate, fileFormat,
      fileSize, lastModified, existing.id
    );
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO tracks (
        id, title, artist_id, album_id, album_artist,
        file_path, duration, track_number, disc_number, genre,
        year, bitrate, sample_rate, format, file_size, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title, artistId, albumId, albumArtistName,
      filePath, duration, trackNumber, discNumber, genre,
      year, bitrate, sampleRate, fileFormat, fileSize, lastModified
    );
  }
}

export function removeTrack(filePath: string): void {
  const db = getDb();
  db.prepare('DELETE FROM tracks WHERE file_path = ?').run(filePath);
}

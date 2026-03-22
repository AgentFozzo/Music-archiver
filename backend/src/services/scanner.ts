import fs from 'fs';
import path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { isAudioFile, processAudioFile, removeTrack } from './localMetadata';
import { enrichAlbumOnline, enrichNewArtists } from './musicbrainz';
import { getDb } from '../database/db';

let watcher: FSWatcher | null = null;
let isScanning = false;

async function scanFile(filePath: string, artworkDir: string): Promise<void> {
  if (!isAudioFile(filePath)) return;
  try {
    await processAudioFile(filePath, artworkDir);
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

async function scanDirectory(dir: string, artworkDir: string): Promise<number> {
  let count = 0;

  async function walk(currentDir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && isAudioFile(fullPath)) {
        await scanFile(fullPath, artworkDir);
        count++;
        if (count % 100 === 0) {
          console.log(`Scanned ${count} files...`);
        }
      }
    }
  }

  await walk(dir);
  return count;
}

async function enrichNewAlbums(): Promise<void> {
  const db = getDb();
  const albums = db.prepare(
    'SELECT id, title, artist_id FROM albums WHERE musicbrainz_id IS NULL LIMIT 20'
  ).all() as Array<{ id: string; title: string; artist_id: string | null }>;

  for (const album of albums) {
    if (!album.artist_id) continue;
    const artist = db.prepare('SELECT name FROM artists WHERE id = ?').get(album.artist_id) as { name: string } | undefined;
    if (!artist) continue;

    try {
      await enrichAlbumOnline(album.id, album.title, artist.name);
      // Rate limit: 1 req/sec for MusicBrainz
      await new Promise(r => setTimeout(r, 1100));
    } catch (err) {
      console.warn(`Failed to enrich album "${album.title}":`, err);
    }
  }
}


export async function runFullScan(musicDir: string, artworkDir: string): Promise<number> {
  if (isScanning) {
    console.log('Scan already in progress, skipping.');
    return 0;
  }

  isScanning = true;
  console.log(`Starting full scan of ${musicDir}...`);

  try {
    const count = await scanDirectory(musicDir, artworkDir);
    console.log(`Scan complete. Processed ${count} audio files.`);

    // After scanning, update album track counts
    const db = getDb();
    db.prepare(`
      UPDATE albums SET total_tracks = (
        SELECT COUNT(*) FROM tracks WHERE album_id = albums.id
      )
    `).run();

    // Enrich with online metadata in background
    enrichNewAlbums().catch(err => console.error('Online enrichment error:', err));
    enrichNewArtists().catch(err => console.error('Artist metadata enrichment error:', err));

    return count;
  } finally {
    isScanning = false;
  }
}

export function startWatcher(musicDir: string, artworkDir: string): void {
  if (watcher) return;

  watcher = chokidar.watch(musicDir, {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },
  });

  watcher
    .on('add', (filePath) => {
      if (isAudioFile(filePath)) {
        console.log(`New file detected: ${filePath}`);
        scanFile(filePath, artworkDir).catch(console.error);
      }
    })
    .on('change', (filePath) => {
      if (isAudioFile(filePath)) {
        console.log(`File changed: ${filePath}`);
        scanFile(filePath, artworkDir).catch(console.error);
      }
    })
    .on('unlink', (filePath) => {
      if (isAudioFile(filePath)) {
        console.log(`File removed: ${filePath}`);
        removeTrack(filePath);
      }
    })
    .on('error', (err) => console.error('Watcher error:', err));

  console.log(`Watching ${musicDir} for changes.`);
}

export function stopWatcher(): void {
  watcher?.close();
  watcher = null;
}

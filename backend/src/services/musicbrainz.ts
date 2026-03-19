import { getDb } from '../database/db';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org';
const USER_AGENT = 'MusicArchiver/1.0 (self-hosted)';

async function mbFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`MusicBrainz API error: ${res.status}`);
  return res.json();
}

interface MBRelease {
  id: string;
  date?: string;
  'tag-list'?: Array<{ name: string; count: number }>;
  'artist-credit'?: Array<{ artist?: { id: string; name: string } }>;
  'release-group'?: { id: string };
}

interface MBSearchResult {
  releases?: MBRelease[];
}

export async function enrichAlbumOnline(
  albumId: string,
  albumTitle: string,
  artistName: string
): Promise<void> {
  const db = getDb();

  try {
    const query = encodeURIComponent(`release:"${albumTitle}" AND artist:"${artistName}"`);
    const data = await mbFetch(
      `${MB_BASE}/release?query=${query}&limit=1&fmt=json&inc=tags+artist-credits+release-groups`
    ) as MBSearchResult;

    const release = data.releases?.[0];
    if (!release) return;

    const mbId = release.id;
    const year = release.date ? parseInt(release.date.slice(0, 4)) : null;
    const genre = release['tag-list']?.[0]?.name ?? null;

    db.prepare(
      'UPDATE albums SET musicbrainz_id = ?, year = COALESCE(year, ?), genre = COALESCE(genre, ?) WHERE id = ?'
    ).run(mbId, year, genre, albumId);

    // Try to fetch cover art if not already stored
    const album = db.prepare('SELECT artwork_path FROM albums WHERE id = ?').get(albumId) as { artwork_path: string | null } | undefined;
    if (!album?.artwork_path && mbId) {
      await fetchCoverArt(albumId, mbId);
    }

    // Update artist MusicBrainz ID
    const artistCredit = release['artist-credit']?.[0]?.artist;
    if (artistCredit) {
      db.prepare(
        'UPDATE artists SET musicbrainz_id = ? WHERE id = (SELECT artist_id FROM albums WHERE id = ?)'
      ).run(artistCredit.id, albumId);
    }
  } catch (err) {
    console.warn(`MusicBrainz enrichment failed for "${albumTitle}":`, err);
  }
}

async function fetchCoverArt(albumId: string, mbReleaseId: string): Promise<void> {
  const db = getDb();
  const artworkDir = process.env.ARTWORK_DIR || '/artwork';

  try {
    const res = await fetch(`${CAA_BASE}/release/${mbReleaseId}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return;

    const data = await res.json() as { images?: Array<{ front?: boolean; image: string; thumbnails?: Record<string, string> }> };
    const front = data.images?.find(img => img.front) ?? data.images?.[0];
    if (!front) return;

    const imgUrl = front.thumbnails?.['500'] || front.thumbnails?.['250'] || front.image;
    const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!imgRes.ok) return;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(artworkDir)) {
      fs.mkdirSync(artworkDir, { recursive: true });
    }

    const artPath = path.join(artworkDir, `${albumId}.jpg`);
    fs.writeFileSync(artPath, buffer);

    db.prepare('UPDATE albums SET artwork_path = ? WHERE id = ?').run(artPath, albumId);
    console.log(`Fetched cover art for album ${albumId}`);
  } catch (err) {
    console.warn(`Cover art fetch failed for ${mbReleaseId}:`, err);
  }
}

export async function fetchArtistBioFromLastFm(
  artistId: string,
  artistName: string,
  apiKey: string
): Promise<void> {
  if (!apiKey) return;
  const db = getDb();

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json() as { artist?: { bio?: { summary?: string }; image?: Array<{ '#text': string; size: string }> } };
    const bio = data.artist?.bio?.summary?.replace(/<[^>]+>/g, '').trim() ?? null;
    const imageUrl = data.artist?.image?.find(i => i.size === 'extralarge')?.['#text'] ?? null;

    db.prepare(
      'UPDATE artists SET bio = COALESCE(bio, ?), image_url = COALESCE(image_url, ?) WHERE id = ?'
    ).run(bio, imageUrl, artistId);
  } catch (err) {
    console.warn(`Last.fm bio fetch failed for "${artistName}":`, err);
  }
}

export async function getSimilarArtistsFromLastFm(
  artistName: string,
  apiKey: string
): Promise<string[]> {
  if (!apiKey) return [];

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json() as { similarartists?: { artist?: Array<{ name: string }> } };
    return data.similarartists?.artist?.map(a => a.name) ?? [];
  } catch {
    return [];
  }
}

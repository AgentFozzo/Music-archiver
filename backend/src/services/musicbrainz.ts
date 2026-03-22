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

/**
 * Enrich an artist using MusicBrainz + Wikipedia.
 * No API key required. Rate-limit: call with 1.1s delay between artists.
 *
 * Strategy:
 *  1. Search MusicBrainz for the artist to get their MBID + Wikipedia URL relation
 *  2. Fetch Wikipedia summary API for bio text + thumbnail image
 *  3. Store bio and image_url in the artists table
 */
export async function enrichArtistFromMusicBrainz(
  artistId: string,
  artistName: string,
): Promise<void> {
  const db = getDb();

  try {
    // 1. Search MB for artist
    const query = encodeURIComponent(`artist:"${artistName}"`);
    const mbData = await mbFetch(
      `${MB_BASE}/artist?query=${query}&limit=1&fmt=json&inc=url-rels`
    ) as { artists?: Array<{
      id: string;
      relations?: Array<{ type: string; url?: { resource: string } }>;
    }> };

    const mbArtist = mbData.artists?.[0];
    if (!mbArtist) return;

    const mbId = mbArtist.id;
    db.prepare('UPDATE artists SET musicbrainz_id = ? WHERE id = ?').run(mbId, artistId);

    // 2. Find Wikipedia or Wikidata URL relation
    const relations = mbArtist.relations ?? [];
    const wikiRel = relations.find(r => r.type === 'wikipedia' && r.url?.resource);
    const wikidataRel = relations.find(r => r.type === 'wikidata' && r.url?.resource);

    let bio: string | null = null;
    let imageUrl: string | null = null;

    if (wikiRel?.url?.resource) {
      // Extract Wikipedia title from URL, use REST API
      const wikiUrl = wikiRel.url.resource;
      const titleMatch = wikiUrl.match(/wikipedia\.org\/wiki\/(.+)$/);
      if (titleMatch) {
        const title = titleMatch[1];
        const lang = wikiUrl.includes('en.wikipedia') ? 'en' : 'en';
        const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`;
        try {
          const wRes = await fetch(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
          if (wRes.ok) {
            const wData = await wRes.json() as {
              extract?: string;
              thumbnail?: { source?: string };
            };
            bio = wData.extract ?? null;
            imageUrl = wData.thumbnail?.source ?? null;
          }
        } catch { /* ignore */ }
      }
    } else if (wikidataRel?.url?.resource) {
      // Extract Wikidata Q-ID and use Wikidata API to find Wikipedia title
      const qMatch = wikidataRel.url.resource.match(/Q\d+$/);
      if (qMatch) {
        const qId = qMatch[0];
        try {
          const wdRes = await fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qId}&format=json&props=sitelinks&sitefilter=enwiki`,
            { headers: { 'User-Agent': USER_AGENT } }
          );
          if (wdRes.ok) {
            const wdData = await wdRes.json() as {
              entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
            };
            const wikiTitle = wdData.entities?.[qId]?.sitelinks?.enwiki?.title;
            if (wikiTitle) {
              const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
              const wRes = await fetch(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
              if (wRes.ok) {
                const wData = await wRes.json() as { extract?: string; thumbnail?: { source?: string } };
                bio = wData.extract ?? null;
                imageUrl = wData.thumbnail?.source ?? null;
              }
            }
          }
        } catch { /* ignore */ }
      }
    }

    if (bio || imageUrl) {
      db.prepare(
        'UPDATE artists SET bio = COALESCE(bio, ?), image_url = COALESCE(image_url, ?) WHERE id = ?'
      ).run(bio, imageUrl, artistId);
      console.log(`Enriched artist "${artistName}" from Wikipedia`);
    }
  } catch (err) {
    console.warn(`Artist enrichment failed for "${artistName}":`, err);
  }
}

/** Enrich all artists missing bio/image. Runs in background, rate-limited. */
export async function enrichNewArtists(apiKey?: string): Promise<void> {
  const db = getDb();
  const artists = db.prepare(
    'SELECT id, name FROM artists WHERE (bio IS NULL OR image_url IS NULL) AND musicbrainz_id IS NULL LIMIT 50'
  ).all() as Array<{ id: string; name: string }>;

  for (const artist of artists) {
    try {
      if (apiKey) {
        await fetchArtistBioFromLastFm(artist.id, artist.name, apiKey);
      } else {
        await enrichArtistFromMusicBrainz(artist.id, artist.name);
      }
      await new Promise(r => setTimeout(r, 1100)); // MusicBrainz rate limit: 1 req/s
    } catch { /* ignore per-artist errors */ }
  }
}

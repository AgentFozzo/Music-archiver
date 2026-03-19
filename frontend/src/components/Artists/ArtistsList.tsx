import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Artist } from '../../types';
import styles from './Artists.module.css';

export default function ArtistsList() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [normalizing, setNormalizing] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = () =>
    api.artists.list().then(res => setArtists(res.artists)).catch(console.error);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleNormalize = async () => {
    setNormalizing(true);
    setStatusMsg(null);
    try {
      const { merged } = await api.artists.normalize();
      setStatusMsg(merged > 0 ? `Merged ${merged} duplicate artist entries.` : 'No duplicates found.');
      await load();
    } catch {
      setStatusMsg('Normalize failed.');
    } finally {
      setNormalizing(false);
    }
  };

  const handleFetchMetadata = async () => {
    setFetchingMeta(true);
    setStatusMsg(null);
    try {
      const { queued } = await api.artists.fetchMetadata();
      setStatusMsg(`Fetching metadata for ${queued} artists in the background…`);
      // Refresh after a delay to pick up newly fetched data
      setTimeout(() => {
        load();
        setFetchingMeta(false);
      }, 10000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg(msg.includes('400') ? 'Set LASTFM_API_KEY in your environment to fetch metadata.' : 'Metadata fetch failed.');
      setFetchingMeta(false);
    }
  };

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Artists</h1>
          <span className={styles.count}>{artists.length} artists</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={handleNormalize}
            disabled={normalizing || loading}
            title="Merge 'Artist feat. X' and 'Artist; X' entries into their primary artist"
          >
            {normalizing ? 'Normalizing…' : 'Normalize'}
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleFetchMetadata}
            disabled={fetchingMeta || loading}
            title="Fetch artist bios and images from Last.fm (requires LASTFM_API_KEY)"
          >
            {fetchingMeta ? 'Fetching…' : 'Fetch Metadata'}
          </button>
        </div>
      </div>

      {statusMsg && <div className={styles.statusMsg}>{statusMsg}</div>}

      {loading ? (
        <div className={styles.loading}>Loading artists...</div>
      ) : (
        <div className={styles.list}>
          {artists.map(artist => (
            <Link key={artist.id} to={`/artists/${artist.id}`} className={styles.row}>
              <div className={styles.avatar}>
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} width={48} height={48} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{artist.name}</span>
                <span className={styles.sub}>
                  {artist.album_count} album{artist.album_count !== 1 ? 's' : ''} · {artist.track_count} song{artist.track_count !== 1 ? 's' : ''}
                  {artist.bio && <span className={styles.bioSnippet}> · {artist.bio.slice(0, 60).trimEnd()}…</span>}
                </span>
              </div>
              <span className={styles.chevron}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { SearchResults as SR } from '../../types';
import ArtworkImage from '../common/ArtworkImage';
import TrackRow from '../common/TrackRow';
import styles from './Search.module.css';

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [results, setResults] = useState<SR | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.search(q)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) return <div className={styles.empty}>Enter a search query.</div>;
  if (loading) return <div className={styles.loading}>Searching...</div>;
  if (!results) return null;

  const hasResults = results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0;

  return (
    <div className={styles.view}>
      <h1 className={styles.title}>Results for "{q}"</h1>

      {!hasResults && <div className={styles.empty}>No results found.</div>}

      {results.artists.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Artists</h2>
          {results.artists.map(artist => (
            <Link key={artist.id} to={`/artists/${artist.id}`} className={styles.artistRow}>
              <div className={styles.artistAvatar}>
                {artist.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={styles.artistName}>{artist.name}</div>
                <div className={styles.artistSub}>{artist.album_count} albums</div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {results.albums.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Albums</h2>
          <div className={styles.albumGrid}>
            {results.albums.map(album => (
              <Link key={album.id} to={`/albums/${album.id}`} className={styles.albumCard}>
                <div className={styles.albumArt}>
                  <ArtworkImage albumId={album.id} size={120} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                </div>
                <div className={`${styles.albumTitle} truncate`}>{album.title}</div>
                <div className={`${styles.albumSub} truncate`}>{album.artist_name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.tracks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Songs</h2>
          {results.tracks.map((track, i) => (
            <TrackRow key={track.id} track={track} queue={results.tracks} showArtwork showAlbum index={i} />
          ))}
        </section>
      )}
    </div>
  );
}

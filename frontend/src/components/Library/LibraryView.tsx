import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Album, Track } from '../../types';
import ArtworkImage from '../common/ArtworkImage';
import TrackRow from '../common/TrackRow';
import styles from './LibraryView.module.css';

export default function LibraryView() {
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.albums.list({ sort: 'created_at', order: 'desc' }),
      api.recommendations(),
    ]).then(([albumsRes, recRes]) => {
      setRecentAlbums(albumsRes.albums.slice(0, 12));
      setRecommendations(recRes.tracks);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading library...</div>;

  return (
    <div className={styles.view}>
      {recentAlbums.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recently Added</h2>
            <Link to="/albums" className={styles.seeAll}>See All</Link>
          </div>
          <div className={styles.albumGrid}>
            {recentAlbums.map(album => (
              <Link key={album.id} to={`/albums/${album.id}`} className={styles.albumCard}>
                <div className={styles.albumArt}>
                  <ArtworkImage albumId={album.id} size={160} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                </div>
                <div className={`${styles.albumTitle} truncate`}>{album.title}</div>
                <div className={`${styles.albumArtist} truncate`}>{album.artist_name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recommended for You</h2>
          </div>
          <div className={styles.trackList}>
            {recommendations.slice(0, 10).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={recommendations}
                showArtwork
                showAlbum
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {recentAlbums.length === 0 && recommendations.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>♪</div>
          <h2>Your library is empty</h2>
          <p>Add music files to your music directory and click "Scan Library" in the sidebar.</p>
        </div>
      )}
    </div>
  );
}

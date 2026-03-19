import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Artist } from '../../types';
import styles from './Artists.module.css';

export default function ArtistsList() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.artists.list()
      .then(res => setArtists(res.artists))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Artists</h1>
        <span className={styles.count}>{artists.length} artists</span>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading artists...</div>
      ) : (
        <div className={styles.list}>
          {artists.map(artist => (
            <Link key={artist.id} to={`/artists/${artist.id}`} className={styles.row}>
              <div className={styles.avatar}>
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} width={44} height={44} />
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Album } from '../../types';
import ArtworkImage from '../common/ArtworkImage';
import styles from './Albums.module.css';

export default function AlbumsGrid() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sort, setSort] = useState<'title' | 'artist' | 'year'>('title');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.albums.list({ sort })
      .then(res => setAlbums(res.albums))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Albums</h1>
        <span className={styles.count}>{albums.length} albums</span>
        <div className={styles.sortBtns}>
          {(['title', 'artist', 'year'] as const).map(s => (
            <button
              key={s}
              className={`${styles.sortBtn} ${sort === s ? styles.active : ''}`}
              onClick={() => setSort(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading albums...</div>
      ) : (
        <div className={styles.grid}>
          {albums.map(album => (
            <Link key={album.id} to={`/albums/${album.id}`} className={styles.card}>
              <div className={styles.art}>
                <ArtworkImage albumId={album.id} size={180} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
              </div>
              <div className={`${styles.cardTitle} truncate`}>{album.title}</div>
              <div className={`${styles.cardSub} truncate`}>
                {album.artist_name}{album.year ? ` · ${album.year}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

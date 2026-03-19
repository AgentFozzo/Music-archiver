import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Track } from '../../types';
import TrackRow from '../common/TrackRow';
import styles from './SongsList.module.css';

type SortKey = 'title' | 'artist' | 'album' | 'year' | 'duration' | 'play_count';

export default function SongsList() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortKey>('title');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const { playTrack, setQueue } = usePlayerStore();

  useEffect(() => {
    setLoading(true);
    api.tracks.list({ sort, order })
      .then(res => { setTracks(res.tracks); setTotal(res.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sort, order]);

  const handleSort = (key: SortKey) => {
    if (sort === key) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setOrder('asc'); }
  };

  const sortIndicator = (key: SortKey) => {
    if (sort !== key) return null;
    return order === 'asc' ? ' ↑' : ' ↓';
  };

  const playAll = () => {
    if (tracks.length > 0) playTrack(tracks[0], tracks);
  };

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Songs</h1>
        <span className={styles.count}>{total.toLocaleString()} songs</span>
        <button className={styles.playAll} onClick={playAll}>▶ Play All</button>
      </div>

      <div className={styles.tableHeader}>
        <div className={styles.num}>#</div>
        <button className={styles.col} onClick={() => handleSort('title')}>
          Title{sortIndicator('title')}
        </button>
        <button className={styles.col} onClick={() => handleSort('artist')}>
          Artist{sortIndicator('artist')}
        </button>
        <button className={styles.col} onClick={() => handleSort('album')}>
          Album{sortIndicator('album')}
        </button>
        <button className={styles.colRight} onClick={() => handleSort('duration')}>
          Time{sortIndicator('duration')}
        </button>
      </div>

      <div className={styles.divider} />

      {loading ? (
        <div className={styles.loading}>Loading songs...</div>
      ) : (
        <div className={styles.list}>
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              queue={tracks}
              showArtwork
              showAlbum
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

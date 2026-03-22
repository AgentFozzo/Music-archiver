import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Album, Track } from '../../types';
import ArtworkImage from '../common/ArtworkImage';
import TrackRow from '../common/TrackRow';
import { formatDuration } from '../../utils/format';
import styles from './Albums.module.css';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<(Album & { tracks: Track[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.albums.get(id)
      .then(setAlbum)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.loading}>Loading album...</div>;
  if (!album) return <div className={styles.loading}>Album not found.</div>;

  const totalDuration = album.tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0);

  // Ensure every track in the queue has album_id / album_title / artwork_path so
  // the player bar can always resolve artwork (API may omit album_id on child tracks)
  const tracks = album.tracks.map(t => ({
    ...t,
    album_id: t.album_id ?? album.id,
    album_title: t.album_title ?? album.title,
    artwork_path: t.artwork_path ?? album.artwork_path,
  }));

  const playAll = () => {
    if (tracks.length > 0) playTrack(tracks[0], tracks);
  };

  return (
    <div className={styles.detail}>
      <div className={styles.detailHero}>
        <div className={styles.detailArt}>
          <ArtworkImage albumId={album.id} size={200} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        </div>
        <div className={styles.detailMeta}>
          <div className={styles.detailType}>Album</div>
          <h1 className={styles.detailTitle}>{album.title}</h1>
          {album.artist_id && (
            <Link to={`/artists/${album.artist_id}`} className={styles.detailArtist}>
              {album.artist_name}
            </Link>
          )}
          <div className={styles.detailInfo}>
            {album.year && <span>{album.year}</span>}
            {album.genre && <span>{album.genre}</span>}
            <span>{album.tracks.length} songs</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className={styles.detailActions}>
            <button className={styles.playBtn} onClick={playAll}>▶ Play</button>
            <button
              className={styles.shuffleBtn}
              onClick={() => {
                usePlayerStore.getState().toggleShuffle();
                playAll();
              }}
            >⇌ Shuffle</button>
          </div>
        </div>
      </div>

      <div className={styles.trackList}>
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            queue={tracks}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

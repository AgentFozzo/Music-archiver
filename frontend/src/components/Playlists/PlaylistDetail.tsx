import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Playlist, Track } from '../../types';
import TrackRow from '../common/TrackRow';
import styles from './Playlists.module.css';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    api.playlists.get(id)
      .then(setPlaylist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.loading}>Loading playlist...</div>;
  if (!playlist) return <div className={styles.loading}>Playlist not found.</div>;

  const tracks = playlist.tracks ?? [];

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div className={styles.icon}>♪</div>
        <div>
          <div className={styles.type}>Playlist</div>
          <h1 className={styles.title}>{playlist.name}</h1>
          <div className={styles.count}>{tracks.length} songs</div>
        </div>
      </div>
      {tracks.length > 0 && (
        <button className={styles.playBtn} onClick={() => playTrack(tracks[0], tracks)}>
          ▶ Play
        </button>
      )}
      <div className={styles.list}>
        {tracks.map((track, i) => (
          <TrackRow key={track.id} track={track} queue={tracks} showArtwork showAlbum index={i} />
        ))}
      </div>
    </div>
  );
}

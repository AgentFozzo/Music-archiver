import { usePlayerStore } from '../../store/playerStore';
import { formatDuration } from '../../utils/format';
import ArtworkImage from './ArtworkImage';
import type { Track } from '../../types';
import styles from './TrackRow.module.css';

interface Props {
  track: Track;
  queue: Track[];
  showArtwork?: boolean;
  showAlbum?: boolean;
  index?: number;
}

export default function TrackRow({ track, queue, showArtwork = false, showAlbum = false, index }: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isActive) {
      togglePlay();
    } else {
      playTrack(track, queue);
    }
  };

  return (
    <div
      className={`${styles.row} ${isActive ? styles.active : ''} ${showAlbum ? styles.withAlbum : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className={styles.num}>
        {isActive ? (
          <span className={styles.playing}>{isPlaying ? '▶' : '⏸'}</span>
        ) : (
          <span className={styles.indexNum}>{index !== undefined ? index + 1 : track.track_number ?? ''}</span>
        )}
      </div>

      {showArtwork && (
        <div className={styles.artwork}>
          <ArtworkImage albumId={track.album_id} size={36} />
        </div>
      )}

      <div className={styles.info}>
        <span className={`${styles.title} truncate`}>{track.title}</span>
        <span className={`${styles.artist} truncate`}>{track.artist_name}</span>
      </div>

      {showAlbum && (
        <span className={`${styles.album} truncate`}>{track.album_title}</span>
      )}

      <span className={styles.duration}>{formatDuration(track.duration)}</span>
    </div>
  );
}

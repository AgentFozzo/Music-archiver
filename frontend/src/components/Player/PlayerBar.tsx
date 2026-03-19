import { usePlayerStore } from '../../store/playerStore';
import { api } from '../../api/client';
import { formatDuration } from '../../utils/format';
import ArtworkImage from '../common/ArtworkImage';
import {
  IconShuffle, IconPrev, IconPlay, IconPause, IconNext, IconRepeat,
  IconVolumeOff, IconVolumeLow, IconVolumeHigh,
} from '../common/Icons';
import styles from './PlayerBar.module.css';

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isShuffle,
    isRepeat,
    volume,
    currentTime,
    duration,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    setVolume,
  } = usePlayerStore();

  const { seek } = usePlayerSeek();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  return (
    <footer className={styles.player}>
      {/* Track info */}
      <div className={styles.trackInfo}>
        <div className={styles.artwork}>
          {currentTrack?.album_id ? (
            <ArtworkImage albumId={currentTrack.album_id} size={52} />
          ) : (
            <div className={styles.artworkPlaceholder} />
          )}
        </div>
        <div className={styles.meta}>
          <span className={`${styles.title} truncate`}>
            {currentTrack?.title ?? 'Not Playing'}
          </span>
          <span className={`${styles.artist} truncate`}>
            {currentTrack?.artist_name ?? ''}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.buttons}>
          <button
            className={`${styles.btn} ${isShuffle ? styles.active : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <IconShuffle size={15} />
          </button>
          <button className={`${styles.btn} ${styles.btnMd}`} onClick={prev} title="Previous">
            <IconPrev size={18} />
          </button>
          <button
            className={`${styles.btn} ${styles.btnPlay}`}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
          </button>
          <button className={`${styles.btn} ${styles.btnMd}`} onClick={next} title="Next">
            <IconNext size={18} />
          </button>
          <button
            className={`${styles.btn} ${isRepeat ? styles.active : ''}`}
            onClick={toggleRepeat}
            title="Repeat"
          >
            <IconRepeat size={15} />
          </button>
        </div>

        <div className={styles.progressRow}>
          <span className={styles.time}>{formatDuration(currentTime)}</span>
          <div className={styles.progressBar} onClick={handleProgressClick}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className={styles.time}>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className={styles.volume}>
        <span className={styles.volumeIcon}>
          {volume === 0 ? <IconVolumeOff size={16} /> : volume < 0.5 ? <IconVolumeLow size={16} /> : <IconVolumeHigh size={16} />}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className={styles.volumeSlider}
        />
      </div>
    </footer>
  );
}

// Small hook to access seek from audio hook without prop drilling
import { useAudioSeek } from '../../hooks/useAudioSeek';
function usePlayerSeek() {
  return useAudioSeek();
}

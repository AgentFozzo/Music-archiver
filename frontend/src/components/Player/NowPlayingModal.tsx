import { usePlayerStore } from '../../store/playerStore';
import { formatDuration } from '../../utils/format';
import ArtworkImage from '../common/ArtworkImage';
import {
  IconShuffle, IconPrev, IconPlay, IconPause, IconNext, IconRepeat,
} from '../common/Icons';
import { useAudioSeek } from '../../hooks/useAudioSeek';
import styles from './NowPlayingModal.module.css';

interface Props {
  onClose: () => void;
}

export default function NowPlayingModal({ onClose }: Props) {
  const {
    currentTrack,
    isPlaying,
    isShuffle,
    isRepeat,
    currentTime,
    duration,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  const { seek } = useAudioSeek();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  if (!currentTrack) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ↓
        </button>

        <div className={styles.artworkWrap}>
          <ArtworkImage
            albumId={currentTrack.album_id}
            trackId={currentTrack.id}
            size={300}
            style={{ width: '100%', height: '100%', borderRadius: 12 }}
          />
        </div>

        <div className={styles.meta}>
          <span className={styles.title}>{currentTrack.title}</span>
          <span className={styles.artist}>{currentTrack.artist_name ?? ''}</span>
          {currentTrack.album_title && (
            <span className={styles.album}>{currentTrack.album_title}</span>
          )}
        </div>

        <div className={styles.progressSection}>
          <div className={styles.progressBar} onClick={handleProgressClick}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className={styles.times}>
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button
            className={`${styles.btn} ${isShuffle ? styles.active : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <IconShuffle size={20} />
          </button>
          <button className={styles.btnMd} onClick={prev} title="Previous">
            <IconPrev size={26} />
          </button>
          <button className={styles.btnPlay} onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <IconPause size={26} /> : <IconPlay size={26} />}
          </button>
          <button className={styles.btnMd} onClick={next} title="Next">
            <IconNext size={26} />
          </button>
          <button
            className={`${styles.btn} ${isRepeat ? styles.active : ''}`}
            onClick={toggleRepeat}
            title="Repeat"
          >
            <IconRepeat size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

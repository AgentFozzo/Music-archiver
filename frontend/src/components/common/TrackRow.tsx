import { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { formatDuration } from '../../utils/format';
import ArtworkImage from './ArtworkImage';
import TrackContextMenu from './TrackContextMenu';
import EditTrackModal from '../Metadata/EditTrackModal';
import type { Track } from '../../types';
import styles from './TrackRow.module.css';

interface Props {
  track: Track;
  queue: Track[];
  showArtwork?: boolean;
  showAlbum?: boolean;
  index?: number;
  playlistId?: string;
  onUpdate?: (updated?: Track) => void;
}

export default function TrackRow({
  track: initialTrack,
  queue,
  showArtwork = false,
  showAlbum = false,
  index,
  playlistId,
  onUpdate,
}: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const [track, setTrack] = useState(initialTrack);
  const [editOpen, setEditOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isActive = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isActive) {
      togglePlay();
    } else {
      playTrack(track, queue);
    }
  };

  const handleSaved = (updated: Track) => {
    setTrack(updated);
    onUpdate?.(updated);
  };

  return (
    <>
      <div
        className={`${styles.row} ${isActive ? styles.active : ''} ${showAlbum ? styles.withAlbum : ''} ${hovered ? 'rowHovered' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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

        <div className={styles.actions} onClick={e => e.stopPropagation()}>
          <TrackContextMenu
            track={track}
            playlistId={playlistId}
            onEdit={() => setEditOpen(true)}
            onRemoved={() => onUpdate?.()}
          />
        </div>

        <span className={styles.duration}>{formatDuration(track.duration)}</span>
      </div>

      {editOpen && (
        <EditTrackModal
          track={track}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

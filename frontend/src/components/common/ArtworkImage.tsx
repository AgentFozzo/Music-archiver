import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Props {
  albumId?: string | null;
  trackId?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232c2c2e'/%3E%3Ctext x='50' y='58' font-size='36' text-anchor='middle' fill='%23555'%3E♪%3C/text%3E%3C/svg%3E`;

export default function ArtworkImage({ albumId, trackId, size = 40, className, style }: Props) {
  const [albumError, setAlbumError] = useState(false);
  const [trackError, setTrackError] = useState(false);

  // Reset error state when IDs change (component reused for different tracks)
  useEffect(() => {
    setAlbumError(false);
    setTrackError(false);
  }, [albumId, trackId]);

  const src = (() => {
    if (!albumError && albumId) return api.artworkUrl(albumId);
    if (!trackError && trackId) return api.trackArtworkUrl(trackId);
    return PLACEHOLDER;
  })();

  const handleError = () => {
    if (!albumError && albumId) {
      // Album artwork failed — try track-embedded artwork next
      setAlbumError(true);
    } else if (!trackError && trackId) {
      setTrackError(true);
    }
  };

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      className={className}
      style={{
        objectFit: 'cover',
        borderRadius: 4,
        ...style,
      }}
      onError={handleError}
      loading="lazy"
    />
  );
}

import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { api } from '../api/client';

/**
 * Syncs playback state with the Media Session API so the OS lock screen
 * shows the current track, album art, and playback controls.
 */
export function useMediaSession(
  onSeek: (time: number) => void,
) {
  const { currentTrack, isPlaying, currentTime, duration, play, pause, next, prev } =
    usePlayerStore();

  // Update metadata (title, artist, album art) when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const artwork: MediaImage[] = currentTrack.album_id
      ? [
          { src: api.artworkUrl(currentTrack.album_id), sizes: '512x512', type: 'image/jpeg' },
          { src: api.artworkUrl(currentTrack.album_id), sizes: '256x256', type: 'image/jpeg' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist_name ?? '',
      album: currentTrack.album_title ?? '',
      artwork,
    });
  }, [currentTrack?.id]);

  // Keep playbackState in sync
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Update position state so the lock screen scrubber is accurate
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // setPositionState not supported on all browsers
    }
  }, [Math.floor(currentTime), duration]);

  // Register action handlers once
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['nexttrack', () => next()],
      ['previoustrack', () => prev()],
      ['seekto', (details) => { if (details.seekTime != null) onSeek(details.seekTime); }],
      ['seekforward', (details) => { onSeek(Math.min(currentTime + (details.seekOffset ?? 10), duration)); }],
      ['seekbackward', (details) => { onSeek(Math.max(currentTime - (details.seekOffset ?? 10), 0)); }],
    ];

    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
    }

    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* noop */ }
      }
    };
  }, [play, pause, next, prev, onSeek, currentTime, duration]);
}

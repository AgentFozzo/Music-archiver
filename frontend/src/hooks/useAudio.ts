import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { api } from '../api/client';
import { registerAudioElement } from './useAudioSeek';
import { useMediaSession } from './useMediaSession';

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playStartRef = useRef<number>(0);

  const {
    currentTrack,
    isPlaying,
    volume,
    isShuffle: _isShuffle,
    next,
    setCurrentTime,
    setDuration,
  } = usePlayerStore();

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      registerAudioElement(audioRef.current);
    }
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Track change: load new source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = api.streamUrl(currentTrack.id);
    audio.load();
    playStartRef.current = Date.now();

    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentTrack?.id]);

  // Play/pause control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (currentTrack) {
        const elapsed = (Date.now() - playStartRef.current) / 1000;
        api.history.record(currentTrack.id, Math.round(elapsed)).catch(() => {});
      }
      next();
    };
    const onError = (e: Event) => console.error('Audio error:', e);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [currentTrack?.id, next, setCurrentTime, setDuration]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  useMediaSession(seek);

  return { audioRef, seek };
}

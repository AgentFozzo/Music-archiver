import { create } from 'zustand';
import type { Track } from '../types';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
  currentTime: number;
  duration: number;

  setCurrentTrack: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (v: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: [],
  queueIndex: 0,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,

  setCurrentTrack: (track) => set({ currentTrack: track }),

  setQueue: (tracks, startIndex = 0) => {
    const { isShuffle } = get();
    if (isShuffle) {
      const shuffled = shuffleArray(tracks);
      set({ queue: shuffled, originalQueue: tracks, queueIndex: 0 });
    } else {
      set({ queue: tracks, originalQueue: tracks, queueIndex: startIndex });
    }
  },

  playTrack: (track, queue) => {
    const { isShuffle } = get();
    if (queue) {
      const idx = queue.findIndex(t => t.id === track.id);
      if (isShuffle) {
        const others = queue.filter(t => t.id !== track.id);
        const shuffled = [track, ...shuffleArray(others)];
        set({ queue: shuffled, originalQueue: queue, queueIndex: 0, currentTrack: track, isPlaying: true });
      } else {
        set({ queue, originalQueue: queue, queueIndex: idx >= 0 ? idx : 0, currentTrack: track, isPlaying: true });
      }
    } else {
      set({ currentTrack: track, isPlaying: true });
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, isRepeat, currentTrack } = get();
    if (isRepeat && currentTrack) {
      // Repeat single: restart same track
      set({ currentTime: 0 });
      return;
    }
    if (queueIndex < queue.length - 1) {
      const newIndex = queueIndex + 1;
      set({ queueIndex: newIndex, currentTrack: queue[newIndex], isPlaying: true });
    } else if (isRepeat) {
      set({ queueIndex: 0, currentTrack: queue[0], isPlaying: true });
    } else {
      set({ isPlaying: false });
    }
  },

  prev: () => {
    const { queue, queueIndex, currentTime } = get();
    // If more than 3s in, restart current track
    if (currentTime > 3 && queueIndex > 0) {
      set({ currentTime: 0 });
      return;
    }
    if (queueIndex > 0) {
      const newIndex = queueIndex - 1;
      set({ queueIndex: newIndex, currentTrack: queue[newIndex], isPlaying: true });
    }
  },

  toggleShuffle: () => {
    const { isShuffle, queue, originalQueue, currentTrack } = get();
    if (isShuffle) {
      // Restore original order, find current track
      const idx = originalQueue.findIndex(t => t.id === currentTrack?.id);
      set({ isShuffle: false, queue: originalQueue, queueIndex: idx >= 0 ? idx : 0 });
    } else {
      // Shuffle, keeping current track first
      const others = queue.filter(t => t.id !== currentTrack?.id);
      const shuffled = currentTrack ? [currentTrack, ...shuffleArray(others)] : shuffleArray(queue);
      set({ isShuffle: true, queue: shuffled, queueIndex: 0 });
    }
  },

  toggleRepeat: () => set(s => ({ isRepeat: !s.isRepeat })),

  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
}));

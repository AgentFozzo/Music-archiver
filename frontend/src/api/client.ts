import type { Track, Album, Artist, Playlist, SearchResults } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  tracks: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<{ tracks: Track[]; total: number }>(`/tracks${q}`);
    },
    get: (id: string) => get<Track>(`/tracks/${id}`),
  },

  albums: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<{ albums: Album[] }>(`/albums${q}`);
    },
    get: (id: string) => get<Album & { tracks: Track[] }>(`/albums/${id}`),
  },

  artists: {
    list: () => get<{ artists: Artist[] }>('/artists'),
    get: (id: string) => get<Artist>(`/artists/${id}`),
  },

  playlists: {
    list: () => get<{ playlists: Playlist[] }>('/playlists'),
    get: (id: string) => get<Playlist>(`/playlists/${id}`),
    create: (name: string, description?: string) => post<Playlist>('/playlists', { name, description }),
    addTrack: (playlistId: string, trackId: string) => post<{ ok: boolean }>(`/playlists/${playlistId}/tracks`, { trackId }),
  },

  search: (q: string) => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),

  recommendations: () => get<{ tracks: Track[] }>('/recommendations'),

  history: {
    record: (trackId: string, durationPlayed?: number) =>
      post<{ ok: boolean }>('/history', { trackId, durationPlayed }),
  },

  scan: () => post<{ ok: boolean; message: string }>('/scan', {}),

  streamUrl: (trackId: string) => `${BASE}/stream/${trackId}`,
  artworkUrl: (albumId: string) => `${BASE}/artwork/album/${albumId}`,
  trackArtworkUrl: (trackId: string) => `${BASE}/artwork/track/${trackId}`,
};

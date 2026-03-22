import type { Track, Album, Artist, Playlist, SearchResults } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || res.statusText);
  }
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const detail = json?.error || json?.message || res.statusText;
    const extra  = json?.output ? `\n${json.output}` : '';
    throw new Error(`${detail}${extra}`);
  }
  return res.json();
}

export const api = {
  tracks: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<{ tracks: Track[]; total: number }>(`/tracks${q}`);
    },
    get: (id: string) => get<Track>(`/tracks/${id}`),
    update: (id: string, data: Partial<Pick<Track, 'title' | 'genre' | 'year' | 'track_number' | 'disc_number'> & { artist_name: string; album_title: string }>) =>
      put<Track>(`/tracks/${id}`, data),
  },

  albums: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<{ albums: Album[] }>(`/albums${q}`);
    },
    get: (id: string) => get<Album & { tracks: Track[] }>(`/albums/${id}`),
    update: (id: string, data: Partial<Pick<Album, 'title' | 'year' | 'genre'>>) =>
      put<Album>(`/albums/${id}`, data),
  },

  artists: {
    list: () => get<{ artists: Artist[] }>('/artists'),
    get: (id: string) => get<Artist>(`/artists/${id}`),
    normalize: () => post<{ merged: number }>('/artists/normalize', {}),
    fetchMetadata: () => post<{ queued: number }>('/artists/fetch-metadata', {}),
  },

  playlists: {
    list: () => get<{ playlists: Playlist[] }>('/playlists'),
    get: (id: string) => get<Playlist & { tracks: Track[] }>(`/playlists/${id}`),
    create: (name: string, description?: string) => post<Playlist>('/playlists', { name, description }),
    update: (id: string, name: string, description?: string) => put<{ ok: boolean }>(`/playlists/${id}`, { name, description }),
    delete: (id: string) => del<{ ok: boolean }>(`/playlists/${id}`),
    addTrack: (playlistId: string, trackId: string) => post<{ ok: boolean }>(`/playlists/${playlistId}/tracks`, { trackId }),
    removeTrack: (playlistId: string, trackId: string) => del<{ ok: boolean }>(`/playlists/${playlistId}/tracks/${trackId}`),
  },

  radio: (params: { seed?: string; genre?: string; artist?: string }) => {
    const q = '?' + new URLSearchParams(params as Record<string, string>).toString();
    return get<{ tracks: Track[]; genre: string | null }>(`/radio${q}`);
  },

  search: (q: string) => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),

  recommendations: () => get<{ tracks: Track[] }>('/recommendations'),

  history: {
    record: (trackId: string, durationPlayed?: number) =>
      post<{ ok: boolean }>('/history', { trackId, durationPlayed }),
  },

  scan: () => post<{ ok: boolean; message: string }>('/scan', {}),

  settings: {
    info: () => get<{
      commit: string;
      branch: string;
      remote: string | null;
      nodeVersion: string;
      uptime: number;
      gitRemoteConfigured: boolean;
    }>('/settings/info'),
    update: () => post<{ updated: boolean; message: string; output?: string; error?: string }>('/settings/update', {}),
  },

  streamUrl: (trackId: string) => `${BASE}/stream/${trackId}`,
  artworkUrl: (albumId: string) => `${BASE}/artwork/album/${albumId}`,
  trackArtworkUrl: (trackId: string) => `${BASE}/artwork/track/${trackId}`,
};

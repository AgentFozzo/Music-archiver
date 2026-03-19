export interface Track {
  id: string;
  title: string;
  artist_id: string | null;
  artist_name: string | null;
  album_id: string | null;
  album_title: string | null;
  artwork_path: string | null;
  duration: number | null;
  track_number: number | null;
  disc_number: number | null;
  genre: string | null;
  year: number | null;
  bitrate: number | null;
  sample_rate: number | null;
  format: string | null;
  file_size: number | null;
  play_count: number;
  created_at: number;
}

export interface Album {
  id: string;
  title: string;
  artist_id: string | null;
  artist_name: string | null;
  year: number | null;
  genre: string | null;
  artwork_path: string | null;
  total_tracks: number | null;
  musicbrainz_id: string | null;
  created_at: number;
  tracks?: Track[];
}

export interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  bio: string | null;
  musicbrainz_id: string | null;
  album_count: number;
  track_count: number;
  albums?: Album[];
  tracks?: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  track_count: number;
  created_at: number;
  updated_at: number;
  tracks?: Track[];
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}

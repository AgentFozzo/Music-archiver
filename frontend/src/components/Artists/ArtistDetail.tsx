import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Artist, Track } from '../../types';
import ArtworkImage from '../common/ArtworkImage';
import TrackRow from '../common/TrackRow';
import styles from './Artists.module.css';

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.artists.get(id)
      .then(setArtist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.loading}>Loading artist...</div>;
  if (!artist) return <div className={styles.loading}>Artist not found.</div>;

  const tracks = artist.tracks ?? [];

  return (
    <div className={styles.detail}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroName}>{artist.name}</h1>
          <span className={styles.heroSub}>{artist.album_count} albums · {artist.track_count} songs</span>
          {tracks.length > 0 && (
            <button className={styles.playBtn} onClick={() => playTrack(tracks[0], tracks)}>
              ▶ Play
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {artist.bio && (
        <div className={styles.bio}>
          <p>{artist.bio.slice(0, 400)}{artist.bio.length > 400 ? '…' : ''}</p>
        </div>
      )}

      {/* Albums */}
      {artist.albums && artist.albums.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Albums</h2>
          <div className={styles.albumGrid}>
            {artist.albums.map(album => (
              <Link key={album.id} to={`/albums/${album.id}`} className={styles.albumCard}>
                <div className={styles.albumArt}>
                  <ArtworkImage albumId={album.id} size={140} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                </div>
                <div className={`${styles.albumTitle} truncate`}>{album.title}</div>
                <div className={styles.albumYear}>{album.year}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top tracks */}
      {tracks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Songs</h2>
          {tracks.slice(0, 20).map((track, i) => (
            <TrackRow key={track.id} track={track} queue={tracks} showArtwork showAlbum index={i} />
          ))}
        </section>
      )}
    </div>
  );
}

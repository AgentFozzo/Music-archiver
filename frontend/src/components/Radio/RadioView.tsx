import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Artist } from '../../types';
import { IconRadio, IconPlay } from '../common/Icons';
import styles from './RadioView.module.css';

export default function RadioView() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    Promise.all([
      api.artists.list(),
      api.tracks.list({ limit: '500' }),
    ]).then(([artistsRes, tracksRes]) => {
      setArtists(artistsRes.artists.slice(0, 18));
      const seen = new Set<string>();
      tracksRes.tracks.forEach(t => { if (t.genre) seen.add(t.genre); });
      setGenres([...seen].sort().slice(0, 12));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const playStation = async (label: string, params: Parameters<typeof api.radio>[0]) => {
    setActiveStation(label);
    try {
      const res = await api.radio(params);
      if (res.tracks.length > 0) {
        playTrack(res.tracks[0], res.tracks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveStation(null);
    }
  };

  if (loading) return <div className={styles.loading}>Loading radio…</div>;

  return (
    <div className={styles.view}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}><IconRadio size={32} /></div>
        <div>
          <h1 className={styles.heroTitle}>Radio</h1>
          <p className={styles.heroSub}>Infinite stations from your library</p>
        </div>
      </div>

      {/* Quick Mix */}
      <section className={styles.section}>
        <button
          className={`${styles.mixCard} ${activeStation === '__mix' ? styles.spinning : ''}`}
          onClick={() => playStation('__mix', {})}
          disabled={activeStation !== null}
        >
          <div className={styles.mixIcon}><IconRadio size={28} /></div>
          <div className={styles.mixText}>
            <span className={styles.mixTitle}>Discover Mix</span>
            <span className={styles.mixSub}>A shuffle through your whole library</span>
          </div>
          <div className={styles.mixPlay}>
            {activeStation === '__mix' ? (
              <span className={styles.spinner} />
            ) : (
              <IconPlay size={18} />
            )}
          </div>
        </button>
      </section>

      {/* Genre Stations */}
      {genres.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Genre Stations</h2>
          <div className={styles.genreGrid}>
            {genres.map(genre => (
              <button
                key={genre}
                className={`${styles.genreCard} ${activeStation === genre ? styles.loading : ''}`}
                onClick={() => playStation(genre, { genre })}
                disabled={activeStation !== null}
              >
                <span className={styles.genrePlay}>
                  {activeStation === genre
                    ? <span className={styles.spinner} />
                    : <IconPlay size={14} />}
                </span>
                <span className={styles.genreName}>{genre}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Artist Stations */}
      {artists.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Artist Stations</h2>
          <div className={styles.artistGrid}>
            {artists.map(artist => (
              <button
                key={artist.id}
                className={`${styles.artistCard} ${activeStation === artist.name ? styles.loading : ''}`}
                onClick={() => playStation(artist.name, { artist: artist.name })}
                disabled={activeStation !== null}
              >
                <div className={styles.artistAvatar}>
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className={styles.artistImg} />
                  ) : (
                    <span className={styles.artistInitial}>{artist.name[0].toUpperCase()}</span>
                  )}
                  <div className={styles.artistOverlay}>
                    {activeStation === artist.name
                      ? <span className={styles.spinner} />
                      : <IconPlay size={18} />}
                  </div>
                </div>
                <span className={styles.artistName}>{artist.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

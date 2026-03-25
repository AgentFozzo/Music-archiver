import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Playlist } from '../../types';
import { IconPlaylist, IconPlus, IconX } from '../common/Icons';
import styles from './PlaylistsListView.module.css';

export default function PlaylistsListView() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.playlists.list()
      .then(r => setPlaylists(r.playlists))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const pl = await api.playlists.create(trimmed);
      navigate(`/playlists/${pl.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Playlists</h1>
        <button
          className={styles.addBtn}
          onClick={() => setCreating(v => !v)}
          title={creating ? 'Cancel' : 'New playlist'}
        >
          {creating ? <IconX size={18} /> : <IconPlus size={18} />}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            ref={inputRef}
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Playlist name…"
            onKeyDown={e => {
              if (e.key === 'Escape') { setCreating(false); setName(''); }
            }}
          />
          <button type="submit" className={styles.createBtn} disabled={!name.trim()}>
            Create
          </button>
        </form>
      )}

      {playlists.length === 0 && !creating ? (
        <div className={styles.empty}>
          <IconPlaylist size={48} className={styles.emptyIcon} />
          <p>No playlists yet</p>
          <button className={styles.emptyBtn} onClick={() => setCreating(true)}>
            Create your first playlist
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {playlists.map(pl => (
            <Link key={pl.id} to={`/playlists/${pl.id}`} className={styles.item}>
              <div className={styles.itemIcon}>
                <IconPlaylist size={20} />
              </div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{pl.name}</span>
                <span className={styles.itemCount}>{pl.track_count} songs</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

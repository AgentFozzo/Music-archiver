import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Playlist, Track } from '../../types';
import TrackRow from '../common/TrackRow';
import { IconEdit, IconTrash } from '../common/Icons';
import styles from './Playlists.module.css';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<(Playlist & { tracks?: Track[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const { playTrack } = usePlayerStore();

  const reload = () => {
    if (!id) return;
    api.playlists.get(id).then(setPlaylist).catch(console.error);
  };

  useEffect(() => {
    if (!id) return;
    api.playlists.get(id)
      .then(setPlaylist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (renaming) { renameRef.current?.focus(); renameRef.current?.select(); }
  }, [renaming]);

  const handleRename = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!id || !newName.trim()) { setRenaming(false); return; }
    try {
      await api.playlists.update(id, newName.trim(), playlist?.description ?? undefined);
      setPlaylist(p => p ? { ...p, name: newName.trim() } : p);
    } catch (err) { console.error(err); }
    setRenaming(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm(`Delete "${playlist?.name}"?`)) return;
    try { await api.playlists.delete(id); navigate('/'); } catch (err) { console.error(err); }
  };

  if (loading) return <div className={styles.loading}>Loading playlist...</div>;
  if (!playlist) return <div className={styles.loading}>Playlist not found.</div>;

  const tracks = playlist.tracks ?? [];

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div className={styles.icon}>♪</div>
        <div className={styles.headerInfo}>
          <div className={styles.type}>Playlist</div>
          {renaming ? (
            <form onSubmit={handleRename}>
              <input
                ref={renameRef}
                className={styles.renameInput}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setRenaming(false); }}
                onBlur={() => handleRename()}
              />
            </form>
          ) : (
            <h1 className={styles.title}>{playlist.name}</h1>
          )}
          <div className={styles.count}>{tracks.length} songs</div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => { setNewName(playlist.name); setRenaming(true); }}
            title="Rename"
          >
            <IconEdit size={16} />
          </button>
          <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete} title="Delete playlist">
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      {tracks.length > 0 && (
        <button className={styles.playBtn} onClick={() => playTrack(tracks[0], tracks)}>
          ▶ Play
        </button>
      )}

      {tracks.length === 0 ? (
        <div className={styles.empty}>
          No tracks yet — use the ⋮ menu on any song to add it here.
        </div>
      ) : (
        <div className={styles.list}>
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              queue={tracks}
              showArtwork
              showAlbum
              index={i}
              playlistId={id}
              onUpdate={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

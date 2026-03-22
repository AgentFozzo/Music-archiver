import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { usePlayerStore } from '../../store/playerStore';
import type { Playlist, Track } from '../../types';
import { IconEdit, IconMore, IconPlay, IconPlaylist, IconPlus, IconRadio, IconTrash, IconX } from './Icons';
import styles from './TrackContextMenu.module.css';

interface Props {
  track: Track;
  playlistId?: string;          // if set → show "Remove from playlist"
  onEdit: () => void;
  onRemoved?: () => void;       // called after remove-from-playlist
}

export default function TrackContextMenu({ track, playlistId, onEdit, onRemoved }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState<'main' | 'playlists'>('main');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { playTrack, setQueue } = usePlayerStore();

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Position below button, shift left if near edge
    let x = rect.right;
    let y = rect.bottom + 4;
    if (x + 220 > window.innerWidth) x = rect.left - 224;
    if (y + 260 > window.innerHeight) y = rect.top - 264;
    setPos({ x, y });
    setStep('main');
    setOpen(true);
  };

  const close = () => { setOpen(false); setStep('main'); setCreating(false); setNewName(''); };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleStartRadio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    close();
    try {
      const { tracks } = await api.radio({ seed: track.id });
      if (tracks.length > 0) playTrack(tracks[0], tracks);
    } catch (err) { console.error(err); }
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStep('playlists');
    setLoadingPlaylists(true);
    api.playlists.list()
      .then(r => setPlaylists(r.playlists))
      .catch(console.error)
      .finally(() => setLoadingPlaylists(false));
  };

  const handleSelectPlaylist = async (e: React.MouseEvent, pid: string) => {
    e.stopPropagation();
    try { await api.playlists.addTrack(pid, track.id); } catch (err) { console.error(err); }
    close();
  };

  const handleCreateAndAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newName.trim()) return;
    try {
      const pl = await api.playlists.create(newName.trim());
      await api.playlists.addTrack(pl.id, track.id);
    } catch (err) { console.error(err); }
    close();
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlistId) return;
    try { await api.playlists.removeTrack(playlistId, track.id); } catch (err) { console.error(err); }
    close();
    onRemoved?.();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    close();
    onEdit();
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Insert track after current in queue
    const { queue, queueIndex, setQueue: sq } = usePlayerStore.getState();
    const next = [...queue];
    next.splice(queueIndex + 1, 0, track);
    sq(next, queueIndex);
    close();
  };

  return (
    <>
      <button
        className={styles.trigger}
        onClick={openMenu}
        title="More options"
        aria-label="More options"
      >
        <IconMore size={14} />
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={close} />
          <div
            ref={menuRef}
            className={styles.menu}
            style={{ left: pos.x, top: pos.y }}
            onClick={e => e.stopPropagation()}
          >
            {step === 'main' ? (
              <>
                <div className={styles.trackInfo}>
                  <div className={styles.trackTitle}>{track.title}</div>
                  <div className={styles.trackArtist}>{track.artist_name}</div>
                </div>
                <div className={styles.divider} />
                <button className={styles.item} onClick={handleEdit}>
                  <IconEdit size={14} /> Edit metadata
                </button>
                <button className={styles.item} onClick={handleAddToPlaylist}>
                  <IconPlaylist size={14} /> Add to playlist
                </button>
                <button className={styles.item} onClick={handleStartRadio}>
                  <IconRadio size={14} /> Start radio
                </button>
                {playlistId && (
                  <>
                    <div className={styles.divider} />
                    <button className={`${styles.item} ${styles.danger}`} onClick={handleRemove}>
                      <IconX size={14} /> Remove from playlist
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button className={styles.backBtn} onClick={e => { e.stopPropagation(); setStep('main'); }}>
                  ← Add to playlist
                </button>
                <div className={styles.divider} />
                {loadingPlaylists ? (
                  <div className={styles.loading}>Loading...</div>
                ) : (
                  <>
                    {playlists.map(pl => (
                      <button key={pl.id} className={styles.item} onClick={e => handleSelectPlaylist(e, pl.id)}>
                        <IconPlaylist size={14} /> {pl.name}
                      </button>
                    ))}
                    <div className={styles.divider} />
                    {creating ? (
                      <div className={styles.newPlaylist}>
                        <input
                          autoFocus
                          className={styles.newInput}
                          placeholder="Playlist name"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAdd(e as unknown as React.MouseEvent); }}
                          onClick={e => e.stopPropagation()}
                        />
                        <button className={styles.newConfirm} onClick={handleCreateAndAdd}>
                          <IconPlus size={13} />
                        </button>
                      </div>
                    ) : (
                      <button className={styles.item} onClick={e => { e.stopPropagation(); setCreating(true); }}>
                        <IconPlus size={14} /> New playlist
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

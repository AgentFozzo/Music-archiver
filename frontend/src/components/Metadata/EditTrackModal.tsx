import { useState } from 'react';
import { api } from '../../api/client';
import type { Track } from '../../types';
import { IconX } from '../common/Icons';
import styles from './EditTrackModal.module.css';

interface Props {
  track: Track;
  onClose: () => void;
  onSaved: (updated: Track) => void;
}

export default function EditTrackModal({ track, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: track.title ?? '',
    artist_name: track.artist_name ?? '',
    album_title: track.album_title ?? '',
    genre: track.genre ?? '',
    year: track.year != null ? String(track.year) : '',
    track_number: track.track_number != null ? String(track.track_number) : '',
    disc_number: track.disc_number != null ? String(track.disc_number) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.tracks.update(track.id, {
        title: form.title.trim() || track.title,
        artist_name: form.artist_name.trim() || undefined,
        album_title: form.album_title.trim() || undefined,
        genre: form.genre.trim() || undefined,
        year: form.year ? parseInt(form.year) : undefined,
        track_number: form.track_number ? parseInt(form.track_number) : undefined,
        disc_number: form.disc_number ? parseInt(form.disc_number) : undefined,
      });
      onSaved(updated as Track);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Edit track</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.input} value={form.title} onChange={set('title')} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Artist</span>
            <input className={styles.input} value={form.artist_name} onChange={set('artist_name')} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Album</span>
            <input className={styles.input} value={form.album_title} onChange={set('album_title')} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Genre</span>
            <input className={styles.input} value={form.genre} onChange={set('genre')} />
          </label>

          <div className={styles.row3}>
            <label className={styles.field}>
              <span className={styles.label}>Year</span>
              <input className={styles.input} type="number" value={form.year} onChange={set('year')} min="1900" max="2099" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Track #</span>
              <input className={styles.input} type="number" value={form.track_number} onChange={set('track_number')} min="1" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Disc #</span>
              <input className={styles.input} type="number" value={form.disc_number} onChange={set('disc_number')} min="1" />
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

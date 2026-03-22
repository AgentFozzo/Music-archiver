import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import type { Playlist } from '../../types';
import {
  IconLibrary, IconSongs, IconAlbums, IconArtists,
  IconSettings, IconSearch, IconRefresh, IconPlaylist, IconPlus, IconX,
} from '../common/Icons';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

// Desktop sidebar nav
const navItems: NavItem[] = [
  { to: '/',        label: 'Library', Icon: IconLibrary },
  { to: '/songs',   label: 'Songs',   Icon: IconSongs   },
  { to: '/albums',  label: 'Albums',  Icon: IconAlbums  },
  { to: '/artists', label: 'Artists', Icon: IconArtists },
];

// Mobile bottom tab items (search replaces songs for space efficiency)
const mobileTabItems: NavItem[] = [
  { to: '/',        label: 'Library', Icon: IconLibrary },
  { to: '/albums',  label: 'Albums',  Icon: IconAlbums  },
  { to: '/artists', label: 'Artists', Icon: IconArtists },
  { to: '/search',  label: 'Search',  Icon: IconSearch  },
  { to: '/settings',label: 'Settings',Icon: IconSettings},
];

const bottomNavItems: NavItem[] = [
  { to: '/settings', label: 'Settings', Icon: IconSettings },
];

export default function Sidebar() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const newPlaylistRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.playlists.list().then(r => setPlaylists(r.playlists)).catch(() => {});
  }, []);

  const handleScan = async () => {
    try { await api.scan(); } catch (e) { console.error('Scan failed:', e); }
  };

  const handleCreatePlaylist = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    try {
      const pl = await api.playlists.create(name);
      setPlaylists(prev => [
        { ...pl, track_count: 0, created_at: Date.now() / 1000, updated_at: Date.now() / 1000 },
        ...prev,
      ]);
      setNewPlaylistName('');
      setCreatingPlaylist(false);
      navigate(`/playlists/${pl.id}`);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (creatingPlaylist) newPlaylistRef.current?.focus();
  }, [creatingPlaylist]);

  return (
    <aside className={styles.sidebar}>
      {/* Mobile: bottom tab bar */}
      <nav className={styles.mobileTabs}>
        {mobileTabItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.mobileTab} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}><item.Icon size={20} /></span>
            <span className={styles.mobileTabLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Desktop: Logo */}
      <div className={styles.logo}>
        <IconLibrary size={20} />
        <span className={styles.logoText}>Music</span>
      </div>

      {/* Desktop: Library nav */}
      <nav className={styles.nav}>
        <span className={styles.sectionLabel}>Library</span>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}><item.Icon size={16} /></span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Playlists section */}
      <nav className={styles.nav} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className={styles.sectionRow}>
          <span className={styles.sectionLabel}>Playlists</span>
          <button
            className={styles.addBtn}
            onClick={() => setCreatingPlaylist(v => !v)}
            title="New playlist"
          >
            {creatingPlaylist ? <IconX size={13} /> : <IconPlus size={13} />}
          </button>
        </div>

        {creatingPlaylist && (
          <form onSubmit={handleCreatePlaylist} className={styles.newPlaylistForm}>
            <input
              ref={newPlaylistRef}
              className={styles.newPlaylistInput}
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name"
              onKeyDown={e => { if (e.key === 'Escape') { setCreatingPlaylist(false); setNewPlaylistName(''); } }}
            />
          </form>
        )}

        <div className={styles.playlistList}>
          {playlists.map(pl => (
            <NavLink
              key={pl.id}
              to={`/playlists/${pl.id}`}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}><IconPlaylist size={15} /></span>
              <span className={`${styles.navLabel} ${styles.playlistName}`}>{pl.name}</span>
            </NavLink>
          ))}
          {playlists.length === 0 && !creatingPlaylist && (
            <span className={styles.emptyPlaylists}>No playlists yet</span>
          )}
        </div>
      </nav>

      {/* Bottom nav */}
      <nav className={styles.nav}>
        {bottomNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}><item.Icon size={16} /></span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.scanBtn} onClick={handleScan} title="Rescan library">
          <IconRefresh size={16} />
          <span className={styles.navLabel}>Scan Library</span>
        </button>
      </div>
    </aside>
  );
}

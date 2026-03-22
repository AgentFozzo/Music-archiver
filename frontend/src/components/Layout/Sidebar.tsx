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

const navItems: NavItem[] = [
  { to: '/',        label: 'Library', Icon: IconLibrary },
  { to: '/songs',   label: 'Songs',   Icon: IconSongs   },
  { to: '/albums',  label: 'Albums',  Icon: IconAlbums  },
  { to: '/artists', label: 'Artists', Icon: IconArtists },
];

const bottomNavItems: NavItem[] = [
  { to: '/settings', label: 'Settings', Icon: IconSettings },
];

export default function Sidebar() {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const newPlaylistRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.playlists.list().then(r => setPlaylists(r.playlists)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearching(false);
      setQuery('');
    }
  };

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
      {/* Logo */}
      <div className={styles.logo}>
        <IconLibrary size={20} />
        <span className={styles.logoText}>Music</span>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        {searching ? (
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              ref={searchRef}
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              autoFocus
              onBlur={() => { if (!query) setSearching(false); }}
            />
          </form>
        ) : (
          <button className={styles.searchBtn} onClick={() => setSearching(true)}>
            <IconSearch size={14} />
            <span className={styles.searchLabel}>Search</span>
          </button>
        )}
      </div>

      {/* Library nav */}
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

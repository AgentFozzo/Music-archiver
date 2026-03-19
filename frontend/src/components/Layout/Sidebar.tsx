import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { api } from '../../api/client';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Library', icon: '♪' },
  { to: '/songs', label: 'Songs', icon: '♫' },
  { to: '/albums', label: 'Albums', icon: '⬛' },
  { to: '/artists', label: 'Artists', icon: '👤' },
];

export default function Sidebar() {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearching(false);
      setQuery('');
    }
  };

  const handleScan = async () => {
    try {
      await api.scan();
    } catch (e) {
      console.error('Scan failed:', e);
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo / App name */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}>♪</span>
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
            <span>⌕</span>
            <span className={styles.searchLabel}>Search</span>
          </button>
        )}
      </div>

      {/* Library section */}
      <nav className={styles.nav}>
        <span className={styles.sectionLabel}>Library</span>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div className={styles.spacer} />

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.scanBtn} onClick={handleScan} title="Rescan library">
          <span>↻</span>
          <span className={styles.navLabel}>Scan Library</span>
        </button>
      </div>
    </aside>
  );
}

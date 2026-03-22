import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconSearch, IconX } from '../common/Icons';
import styles from './TopBar.module.css';

export default function TopBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when search param changes (e.g. back navigation)
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <header className={styles.topBar}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <IconSearch size={15} className={styles.searchIcon} />
        <input
          ref={inputRef}
          className={styles.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs, albums, artists…"
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button type="button" className={styles.clearBtn} onClick={handleClear} aria-label="Clear">
            <IconX size={13} />
          </button>
        )}
      </form>
    </header>
  );
}

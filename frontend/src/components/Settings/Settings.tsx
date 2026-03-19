import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import styles from './Settings.module.css';

type ServerInfo = Awaited<ReturnType<typeof api.settings.info>>;

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ');
}

export default function Settings() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'info' | 'success' | 'error'; msg: string }>({
    type: 'idle', msg: '',
  });

  useEffect(() => {
    api.settings.info().then(setInfo).catch(console.error);
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setStatus({ type: 'idle', msg: '' });

    try {
      const res = await api.settings.update();

      if (!res.updated) {
        setStatus({ type: 'info', msg: res.message });
        setUpdating(false);
        return;
      }

      setStatus({
        type: 'success',
        msg: 'Update pulled. Rebuilding and restarting — page will reload automatically.',
      });

      // Poll /api/health until the server comes back up, then reload
      const poll = () =>
        fetch('/api/health')
          .then(r => { if (r.ok) window.location.reload(); else setTimeout(poll, 2000); })
          .catch(() => setTimeout(poll, 2000));

      setTimeout(poll, 6000);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const msg = raw.includes('400')
        ? 'GIT_REMOTE is not configured. Add -e GIT_REMOTE=<repo-url> to your docker run command.'
        : `Update failed: ${raw}`;
      setStatus({ type: 'error', msg });
      setUpdating(false);
    }
  };

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Server Info</h2>
        <div className={styles.infoGrid}>
          {[
            ['Git commit', info?.commit],
            ['Branch',     info?.branch],
            ['Node.js',    info?.nodeVersion],
            ['Uptime',     info ? formatUptime(info.uptime) : undefined],
            ['Git remote', info?.gitRemoteConfigured ? 'configured' : 'not configured'],
          ].map(([label, value]) => (
            <div key={label as string} className={styles.infoRow}>
              <span className={styles.infoLabel}>{label}</span>
              <span className={styles.infoValue}>{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Update</h2>
        <p className={styles.hint}>
          Pulls the latest code from the configured git remote, rebuilds the app,
          and restarts the server automatically.
          Set <code>GIT_REMOTE</code> (and optionally <code>GIT_BRANCH</code>) in your{' '}
          <code>docker run</code> command to enable this.
        </p>

        {status.type !== 'idle' && (
          <div className={`${styles.statusBanner} ${styles[status.type]}`}>
            {status.msg}
          </div>
        )}

        <button className={styles.updateBtn} onClick={handleUpdate} disabled={updating}>
          {updating ? (
            <><span className={styles.spinner} /> Updating…</>
          ) : (
            'Update Now'
          )}
        </button>
      </div>
    </div>
  );
}

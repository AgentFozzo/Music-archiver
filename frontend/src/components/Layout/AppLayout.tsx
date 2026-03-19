import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import PlayerBar from '../Player/PlayerBar';
import styles from './AppLayout.module.css';

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className={styles.root}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
      <PlayerBar />
    </div>
  );
}

import { Router, Request, Response } from 'express';
import { runFullScan } from '../services/scanner';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  const musicDir = process.env.MUSIC_DIR || '/music';
  const artworkDir = process.env.ARTWORK_DIR || '/artwork';

  // Respond immediately, scan runs async
  res.json({ ok: true, message: 'Scan started' });

  try {
    const count = await runFullScan(musicDir, artworkDir);
    console.log(`Scan finished: ${count} files processed.`);
  } catch (err) {
    console.error('Scan error:', err);
  }
});

export default router;

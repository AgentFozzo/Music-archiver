import { Router, Request, Response } from 'express';
import { getRecommendations } from '../services/recommendations';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const recommendations = getRecommendations(20);
    res.json({ tracks: recommendations });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;

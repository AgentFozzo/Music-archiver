import { Router, Request, Response } from 'express';
import { spawnSync } from 'child_process';

const router = Router();

const REPO = '/app';

function git(...args: string[]) {
  return spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf-8' });
}

router.get('/info', (_req: Request, res: Response) => {
  const commit  = git('rev-parse', '--short', 'HEAD').stdout?.trim() ?? 'unknown';
  const branch  = git('rev-parse', '--abbrev-ref', 'HEAD').stdout?.trim() ?? 'unknown';
  const remote  = git('remote', 'get-url', 'origin').stdout?.trim() ?? null;

  res.json({
    commit,
    branch,
    remote: remote || null,
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    gitRemoteConfigured: !!process.env.GIT_REMOTE,
  });
});

router.post('/update', (req: Request, res: Response) => {
  const remote = process.env.GIT_REMOTE;

  if (!remote) {
    return res.status(400).json({
      error:
        'GIT_REMOTE is not set. Add -e GIT_REMOTE=<repo-url> to your docker run command. ' +
        'For a local Gitea server use the Docker bridge IP, e.g. http://172.17.0.1:37507/git/user/repo',
    });
  }

  // Point origin at the configured remote
  if (git('remote', 'get-url', 'origin').status !== 0) {
    git('remote', 'add', 'origin', remote);
  } else {
    git('remote', 'set-url', 'origin', remote);
  }

  // Determine branch: env var → current HEAD branch → 'main'
  const branch =
    process.env.GIT_BRANCH ||
    git('rev-parse', '--abbrev-ref', 'HEAD').stdout?.trim() ||
    'main';

  const pull = git('pull', 'origin', branch);

  if (pull.status !== 0) {
    return res.status(500).json({
      error: 'git pull failed',
      output: (pull.stderr || pull.stdout || '').trim(),
    });
  }

  const output = pull.stdout?.trim() ?? '';
  if (output.includes('Already up to date')) {
    return res.json({ updated: false, message: 'Already up to date.' });
  }

  res.json({ updated: true, message: 'Pulled latest changes. Rebuilding and restarting…', output });

  // Exit with 42 — docker-entrypoint.sh catches this, rebuilds, and restarts
  setTimeout(() => process.exit(42), 200);
});

export default router;

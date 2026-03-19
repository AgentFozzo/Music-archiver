import { Router, Request, Response } from 'express';
import { spawnSync } from 'child_process';
import fs from 'fs';

const router = Router();

const REPO = '/app';

function git(...args: string[]) {
  return spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf-8' });
}

function gitAvailable() {
  return spawnSync('git', ['--version'], { encoding: 'utf-8' }).status === 0;
}

function isGitRepo() {
  return fs.existsSync(`${REPO}/.git`);
}

router.get('/info', (_req: Request, res: Response) => {
  const hasGit  = gitAvailable();
  const hasRepo = isGitRepo();

  const commit = hasGit && hasRepo ? (git('rev-parse', '--short', 'HEAD').stdout?.trim() || 'unknown') : 'n/a';
  const branch = hasGit && hasRepo ? (git('rev-parse', '--abbrev-ref', 'HEAD').stdout?.trim() || 'unknown') : 'n/a';

  res.json({
    commit,
    branch,
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    gitAvailable: hasGit,
    gitRepoPresent: hasRepo,
    gitRemoteConfigured: !!process.env.GIT_REMOTE,
  });
});

router.post('/update', (req: Request, res: Response) => {
  if (!gitAvailable()) {
    return res.status(500).json({
      error: 'git is not installed in this container. Rebuild the Docker image with the latest Dockerfile (it now uses a single-stage build that includes git).',
    });
  }

  if (!isGitRepo()) {
    return res.status(500).json({
      error: 'No .git directory found at /app. Rebuild the Docker image — the latest Dockerfile copies the .git directory into the image so git pull can work.',
    });
  }

  const remote = process.env.GIT_REMOTE;

  if (!remote) {
    return res.status(400).json({
      error:
        'GIT_REMOTE is not set. Add -e GIT_REMOTE=<repo-url> to your docker run command. ' +
        'For a local Gitea server reachable from the container use the Docker bridge IP, ' +
        'e.g. http://172.17.0.1:37507/git/user/repo',
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
    const output = (pull.stderr || pull.stdout || '').trim();
    let hint = '';
    if (output.includes('Could not connect') || output.includes('Failed to connect') || output.includes('Connection refused')) {
      hint =
        '\n\nThe container cannot reach the git server. If you are using a local Gitea instance, ' +
        'find the correct Docker bridge IP by running on the host:\n' +
        '  ip route show | grep docker\n' +
        'or:  docker network inspect bridge | grep Gateway\n' +
        'Then restart the container with -e GIT_REMOTE=http://<bridge-ip>:<port>/...';
    }
    return res.status(500).json({
      error: `git pull origin ${branch} failed${hint}`,
      output,
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

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../database/db';

const router = Router();

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  opus: 'audio/opus',
  wma: 'audio/x-ms-wma',
  ape: 'audio/x-ape',
  aiff: 'audio/aiff',
  aif: 'audio/aiff',
};

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();

  const track = db.prepare('SELECT file_path, format FROM tracks WHERE id = ?').get(req.params.id) as
    | { file_path: string; format: string }
    | undefined;

  if (!track) return res.status(404).json({ error: 'Track not found' });

  const { file_path, format } = track;

  if (!fs.existsSync(file_path)) {
    return res.status(404).json({ error: 'Audio file not found on disk' });
  }

  const stat = fs.statSync(file_path);
  const fileSize = stat.size;
  const mimeType = MIME_TYPES[format] ?? 'audio/mpeg';

  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    const stream = fs.createReadStream(file_path, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(file_path).pipe(res);
  }
});

export default router;

import type Database from 'better-sqlite3';
import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { createStudioRouter } from './routes/studio.js';

type SqliteDatabase = Database.Database;

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function createServer(db: SqliteDatabase, dataDirectory: string) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  // StudyGenius+ is a local-first application. Keeping the API on loopback
  // prevents another machine on the network from using local files or keys.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const remoteIp = req.socket.remoteAddress;
    const isLoopback = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
    if (!isLoopback) {
      res.status(403).json({ error: 'Accesso consentito solo dalla macchina locale.' });
      return;
    }
    next();
  });

  app.get('/health/ready', (_req: Request, res: Response) => {
    res.json({ status: 'ready', version: '1.1.0', mode: 'local-first' });
  });
  app.use('/api/studio', createStudioRouter(db, dataDirectory));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint non trovato.' });
  });

  return app;
}

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { setupAuthMiddleware } from './auth.js';
import { createJobsRouter } from './routes/jobs.js';
import { createSettingsRouter } from './routes/settings.js';
import { createSourcesRouter } from './routes/sources.js';
import { createDidacticRouter } from './routes/didactic.js';
import { JobRepository } from '../../../../packages/storage/src/job_repository.js';
import type { Database } from 'better-sqlite3';

export function createServer(db: Database) {
  const app = express();
  const repo = new JobRepository(db);

  // Basic security middlewares
  app.use(helmet());
  app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // Vite default port
  app.use(express.json());

  // Enforce loopback only
  app.use((req: Request, res: Response, next: NextFunction) => {
    const remoteIp = req.socket.remoteAddress;
    if (remoteIp !== '127.0.0.1' && remoteIp !== '::1' && remoteIp !== '::ffff:127.0.0.1') {
      res.status(403).json({ error: 'Access denied: Loopback only' });
      return;
    }
    
    // Host check
    const host = req.get('host');
    if (!host || (!host.startsWith('localhost:') && !host.startsWith('127.0.0.1:'))) {
      res.status(403).json({ error: 'Access denied: Invalid Host' });
      return;
    }
    next();
  });

  setupAuthMiddleware(app);

  app.get('/health/ready', (req: Request, res: Response) => {
    res.json({ status: 'ready', version: '1.0.0' });
  });

  app.use('/api/v1/jobs', createJobsRouter(repo));
  app.use('/api/settings', createSettingsRouter(db.name));
  app.use('/api/sources', createSourcesRouter(db.name, './test-blobs'));
  app.use('/api/didactic', createDidacticRouter());

  return app;
}

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// A simple in-memory session store for local app
const localSessions = new Set<string>();
let bootstrapToken: string | null = crypto.randomBytes(32).toString('hex');

export function getBootstrapToken() {
  return bootstrapToken;
}

export function setupAuthMiddleware(app: express.Express) {
  app.post('/api/v1/auth/bootstrap', (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token || token !== bootstrapToken) {
      res.status(401).json({ error: 'Invalid bootstrap token' });
      return;
    }
    // Invalidate bootstrap token after use
    bootstrapToken = null;
    
    // Issue a session token (we're skipping actual secure cookies for the sake of the spike/M02, 
    // but in a real app this would use res.cookie with HttpOnly and SameSite=Strict).
    const sessionToken = crypto.randomBytes(32).toString('hex');
    localSessions.add(sessionToken);
    
    res.cookie('session', sessionToken, { 
      httpOnly: true, 
      sameSite: 'strict',
      // secure: false (since local)
    });
    res.json({ ok: true });
  });

  // Middleware to protect routes
  app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/auth/bootstrap' || req.path === '/api/v1/auth/bootstrap') {
      next();
      return;
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    if (!sessionMatch || !localSessions.has(sessionMatch[1])) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Origin check for mutating requests (CSRF protection)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if (!origin || !['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)) {
        res.status(403).json({ error: 'Forbidden: Invalid Origin' });
        return;
      }
    }

    next();
  });
}

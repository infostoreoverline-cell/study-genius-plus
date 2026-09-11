import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/http/server.js';
import { getBootstrapToken } from '../src/http/auth.js';
import { getDatabase } from '../../../packages/storage/src/database.js';
import * as http from 'http';

describe('Security Middleware Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const db = getDatabase(':memory:');
    const app = createServer(db);
    
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address() as any;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => {
    server.close();
  });

  it('Health check is available', async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ready');
  });

  it('Missing bootstrap token yields 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong-token' })
    });
    expect(res.status).toBe(401);
  });

  it('Valid bootstrap token yields ok', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getBootstrapToken() })
    });
    expect(res.status).toBe(200);
  });
});

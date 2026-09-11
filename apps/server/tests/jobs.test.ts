import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/http/server.js';
import { getBootstrapToken } from '../src/http/auth.js';
import { getDatabase } from '../../../packages/storage/src/database.js';
import { JobRepository } from '../../../packages/storage/src/job_repository.js';
import { Dispatcher } from '../src/worker/dispatcher.js';
import { SimulatedProvider } from '../src/worker/simulated_provider.js';

describe('Jobs Integration Tests', () => {
  const db = getDatabase(':memory:');
  
  // Create some initial data for foreign keys
  db.prepare(`INSERT INTO subject_profiles (id, name, discipline, revision_id) VALUES ('sub-1', 'Name', 'Discipline', 'rev-1')`).run();
  db.prepare(`INSERT INTO projects (id, title, subject_profile_id, created_at) VALUES ('proj-1', 'Test', 'sub-1', '2026')`).run();
  db.prepare(`INSERT INTO generation_requests (id, project_id, request_json, hash) VALUES ('req-1', 'proj-1', '{}', 'hash')`).run();
  db.prepare(`INSERT INTO budget_accounts (id) VALUES ('acc-1')`).run();
  
  const repo = new JobRepository(db);
  const dispatcher = new Dispatcher(repo);
  const app = createServer(db);

  const http = await import('http');
  const server = http.createServer(app);
  
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  
  // Start dispatcher
  dispatcher.start();

  let jobId = '';

  const headers = { 
    'Content-Type': 'application/json',
    'Cookie': `session=test-session`, // Mocking session won't work unless we bootstrap, let's bootstrap first
    'Origin': 'http://localhost:5173'
  };

  await t.test('Bootstrap', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getBootstrapToken() })
    });
    const cookie = res.headers.get('set-cookie');
    assert.ok(cookie);
    headers['Cookie'] = cookie;
  });

  await t.test('Create Job', async () => {
    const res = await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId: 'proj-1', requestRevisionId: 'req-1', budgetAccountId: 'acc-1' })
    });
    const json = await res.json();
    if (!res.ok) console.error('Create Job failed:', json);
    assert.ok(json.data.jobId);
    jobId = json.data.jobId;
  });

  await t.test('Start Job', async () => {
    const res = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/start`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    assert.strictEqual(data.ok, true);
  });

  await t.test('Wait for completion via SSE', async () => {
    // We will connect to SSE and wait for COMPLETED state
    return new Promise<void>((resolve, reject) => {
      const req = http.request(`${baseUrl}/api/v1/jobs/${jobId}/events`, {
        headers
      }, (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          
          for (const ev of events) {
            if (ev.includes('job.state_changed')) {
              if (ev.includes('COMPLETED') || ev.includes('FAILED')) {
                req.destroy();
                resolve();
              }
            }
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  });

  dispatcher.stop();
  server.close();
});

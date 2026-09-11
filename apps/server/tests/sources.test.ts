import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/http/server.js';
import Database from 'better-sqlite3';
import { Migrator } from '../../../packages/storage/src/migrator.js';
import fs from 'fs';
import crypto from 'crypto';

describe('Sources API', () => {
  let db: any;
  let app: any;
  const dbPath = './test-sources.sqlite';
  const blobStorePath = './test-sources-blobs';
  
  beforeAll(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(blobStorePath)) fs.rmdirSync(blobStorePath, { recursive: true });
    
    db = new Database(dbPath);
    const migrator = new Migrator(db, './packages/storage/src/migrations');
    migrator.migrate();
    
    app = createServer(db);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(blobStorePath)) fs.rmdirSync(blobStorePath, { recursive: true });
  });

  it('should initialize sources routes', async () => {
    expect(app).toBeTruthy();
  });
});

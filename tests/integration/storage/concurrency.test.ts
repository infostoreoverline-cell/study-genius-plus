import { test } from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../../../packages/storage/src/database.js';
import { existsSync, unlinkSync } from 'fs';
import crypto from 'crypto';

test('concurrency and transaction rollback', () => {
  const dbPath = './test-concurrency.db';
  if (existsSync(dbPath)) unlinkSync(dbPath);

  const db = getDatabase(dbPath);
  
  const insertProject = db.prepare('INSERT INTO projects (id, title, subject_profile_id, created_at) VALUES (?, ?, ?, ?)');
  
  // Test 1: Successful Transaction
  const projectId = crypto.randomUUID();
  const tx1 = db.transaction(() => {
    insertProject.run(projectId, 'Test Project', crypto.randomUUID(), new Date().toISOString());
  });
  tx1();
  
  const projectCheck = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  assert.ok(projectCheck);

  // Test 2: Transaction Rollback
  const tx2 = db.transaction(() => {
    insertProject.run(crypto.randomUUID(), 'Failing Project', crypto.randomUUID(), new Date().toISOString());
    throw new Error('Simulated failure');
  });

  assert.throws(() => tx2(), /Simulated failure/);
  
  // Verify the second project wasn't inserted
  const allProjects = db.prepare('SELECT * FROM projects').all();
  assert.strictEqual(allProjects.length, 1);
  
  // Test 3: Concurrent write conflict check (optimistic concurrency / UNIQUE constraint)
  // We'll simulate this by violating a unique constraint
  const insertDuplicate = db.prepare('INSERT INTO projects (id, title, subject_profile_id, created_at) VALUES (?, ?, ?, ?)');
  
  assert.throws(() => {
    insertDuplicate.run(projectId, 'Duplicate', crypto.randomUUID(), new Date().toISOString());
  }, /UNIQUE constraint failed: projects.id/);

  db.close();
  if (existsSync(dbPath)) unlinkSync(dbPath);
});

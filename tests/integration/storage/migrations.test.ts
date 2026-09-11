import { test } from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../../../packages/storage/src/database.js';
import { existsSync, unlinkSync } from 'fs';

test('migrations run successfully and idempotently', () => {
  const dbPath = './test-migrations.db';
  if (existsSync(dbPath)) unlinkSync(dbPath);

  // First run should apply migrations
  const db1 = getDatabase(dbPath);
  
  // Verify a table exists
  const tableCheck = db1.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get();
  assert.ok(tableCheck);

  db1.close();

  // Second run should be idempotent
  const db2 = getDatabase(dbPath);
  const tableCheck2 = db2.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get();
  assert.ok(tableCheck2);
  
  db2.close();
  if (existsSync(dbPath)) unlinkSync(dbPath);
});

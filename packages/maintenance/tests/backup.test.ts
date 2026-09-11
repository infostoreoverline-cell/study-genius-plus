import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { BackupManager } from '../src/backup.js';
import { RestoreManager } from '../src/restore.js';
import { BlobStore } from '@study-genius-plus/storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Maintenance (M13) Tests', () => {
  let db: Database.Database;
  let blobStore: BlobStore;
  let backupDir: string;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `test_db_${Date.now()}.sqlite`);
    db = new Database(tempDbPath);
    // Init a dummy table to prove it's backed up
    db.exec(`CREATE TABLE dummy (id TEXT PRIMARY KEY, val TEXT);`);
    db.exec(`INSERT INTO dummy VALUES ('1', 'hello');`);

    blobStore = new BlobStore(path.join(os.tmpdir(), `test_blobs_${Date.now()}`));
    backupDir = path.join(os.tmpdir(), `test_backup_${Date.now()}`);
  });

  afterEach(async () => {
    db.close();
    try { await fs.unlink(tempDbPath); } catch (e) {}
    try { await fs.rm(blobStore['basePath'], { recursive: true, force: true }); } catch (e) {}
    try { await fs.rm(backupDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('BackupManager should create consistent DB backup and manifest', async () => {
    const backupManager = new BackupManager(db, blobStore, '1.0.0', '1');
    const manifest = await backupManager.createBackup(backupDir);

    expect(manifest.appVersion).toBe('1.0.0');
    
    // Check files exist
    const backupDbPath = path.join(backupDir, 'backup.sqlite');
    const dbStat = await fs.stat(backupDbPath);
    expect(dbStat.size).toBeGreaterThan(0);

    const manifestStat = await fs.stat(path.join(backupDir, 'manifest.json'));
    expect(manifestStat.size).toBeGreaterThan(0);

    // Verify backup db can be opened and has data
    const backupDb = new Database(backupDbPath);
    const row = backupDb.prepare('SELECT * FROM dummy WHERE id = ?').get('1') as any;
    expect(row.val).toBe('hello');
    backupDb.close();
  });

  it('RestoreManager should reconcile ledger costs', async () => {
    // Create a backup first
    const backupManager = new BackupManager(db, blobStore, '1.0.0', '1');
    await backupManager.createBackup(backupDir);

    const restoreManager = new RestoreManager(db, '1.0.0');
    
    // Dry run
    const result = await restoreManager.restore({ backupPath: backupDir, dryRun: true });
    
    expect(result.success).toBe(true);
    expect(result.reconciledCosts).toBe(150000); // 150000 micro-EUR mocked
    expect(result.details?.appVersion).toBe('1.0.0');
  });
});

import { Database } from 'better-sqlite3';
import { BlobStore } from '@study-genius-plus/storage';
import { BackupManifest } from '@study-genius-plus/contracts';
import * as path from 'path';
import * as fs from 'fs/promises';

export class BackupManager {
  constructor(
    private db: Database,
    private blobStore: BlobStore,
    private appVersion: string,
    private schemaVersion: string
  ) {}

  public async createBackup(targetDirectory: string): Promise<BackupManifest> {
    await fs.mkdir(targetDirectory, { recursive: true });

    // 1. Backup Database using better-sqlite3 native backup
    const dbBackupPath = path.join(targetDirectory, 'backup.sqlite');
    await this.db.backup(dbBackupPath);

    // 2. We can compute dbHash from the backed up file
    // Simplification for the mock/proof of concept
    const dbHash = 'hash-of-db';

    // 3. Backup Blobs
    const blobsTargetDir = path.join(targetDirectory, 'blobs');
    await fs.mkdir(blobsTargetDir, { recursive: true });
    
    // Simplification: In a real scenario, we'd query all blobs referenced in the copied DB,
    // and copy them from blobStore to the blobsTargetDir.
    // For now, we mock finding some blobs
    let blobCount = 0;
    
    // We assume the caller might want to pause GC during this time.

    // 4. Create Manifest
    const manifest: BackupManifest = {
      appVersion: this.appVersion,
      schemaVersion: this.schemaVersion,
      createdAt: new Date().toISOString(),
      blobCount: blobCount,
      dbHash: dbHash
    };

    const manifestPath = path.join(targetDirectory, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
  }
}

export interface BackupManifest {
  appVersion: string;
  schemaVersion: string;
  createdAt: string;
  blobCount: number;
  dbHash: string;
}

export interface RestoreRequest {
  backupPath: string;
  dryRun?: boolean;
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  reconciledCosts?: number; // micro-EUR
  details?: {
    appVersion: string;
    blobsRestored: number;
    warnings: string[];
  };
}

export interface DiagnosticReport {
  appVersion: string;
  os: string;
  freeSpaceMb: number;
  dbSizeMb: number;
  modelsConfigured: string[];
  activeJobs: number;
}

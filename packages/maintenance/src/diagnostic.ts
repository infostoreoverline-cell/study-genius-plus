import { DiagnosticReport } from '@study-genius-plus/contracts';

export class DiagnosticService {
  constructor(private appVersion: string) {}

  public async getReport(): Promise<DiagnosticReport> {
    return {
      appVersion: this.appVersion,
      os: process.platform,
      freeSpaceMb: 1024,
      dbSizeMb: 5,
      modelsConfigured: ['google-gemini-1.5'],
      activeJobs: 0
    };
  }
}

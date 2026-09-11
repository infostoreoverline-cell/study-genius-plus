import type { Database } from 'better-sqlite3';
import crypto from 'crypto';

export class JobRepository {
  constructor(private db: Database) {}

  createJob(projectId: string, requestRevisionId: string, budgetAccountId: string): string {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, project_id, request_revision_id, status, stage, budget_account_id, version)
      VALUES (?, ?, ?, 'DRAFT', 'EXTRACT_TEXT', ?, 1)
    `);
    stmt.run(id, projectId, requestRevisionId, budgetAccountId);
    return id;
  }

  getJob(id: string) {
    return this.db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as any;
  }

  updateJobStatus(id: string, status: string, stage?: string) {
    if (stage) {
      this.db.prepare(`UPDATE jobs SET status = ?, stage = ?, version = version + 1 WHERE id = ?`).run(status, stage, id);
    } else {
      this.db.prepare(`UPDATE jobs SET status = ?, version = version + 1 WHERE id = ?`).run(status, id);
    }
  }

  createTask(jobId: string, kind: string, inputHash: string): string {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, job_id, kind, state, input_hash)
      VALUES (?, ?, ?, 'READY', ?)
    `);
    stmt.run(id, jobId, kind, inputHash);
    return id;
  }

  claimReadyTask(ownerId: string, leaseMs: number): any {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + leaseMs).toISOString();

    const claimStmt = this.db.prepare(`
      UPDATE tasks 
      SET state = 'RUNNING', lease_owner = ?, lease_until = ?
      WHERE id = (
        SELECT id FROM tasks 
        WHERE state = 'READY' 
           OR (state = 'RUNNING' AND lease_until < ?)
        LIMIT 1
      )
      RETURNING *
    `);
    
    // We execute it in a transaction for safety if needed, but RETURNING handles concurrency safely in SQLite WAL.
    return claimStmt.get(ownerId, leaseUntil, now.toISOString()) as any;
  }

  updateTaskState(id: string, state: string) {
    this.db.prepare(`UPDATE tasks SET state = ?, lease_owner = NULL, lease_until = NULL WHERE id = ?`).run(state, id);
  }

  getTask(id: string) {
    return this.db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as any;
  }
  
  getTasksForJob(jobId: string) {
    return this.db.prepare(`SELECT * FROM tasks WHERE job_id = ?`).all(jobId) as any[];
  }

  appendJobEvent(jobId: string, type: string, payload: any): number {
    return this.db.transaction(() => {
      const maxSeqObj = this.db.prepare(`SELECT MAX(sequence) as seq FROM job_events WHERE job_id = ?`).get(jobId) as { seq: number | null };
      const nextSeq = (maxSeqObj.seq ?? 0) + 1;
      
      this.db.prepare(`
        INSERT INTO job_events (job_id, sequence, type, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(jobId, nextSeq, type, JSON.stringify(payload), new Date().toISOString());
      
      return nextSeq;
    })();
  }

  getJobEvents(jobId: string, sinceSequence: number = 0) {
    return this.db.prepare(`
      SELECT sequence, type, payload_json, created_at 
      FROM job_events 
      WHERE job_id = ? AND sequence > ? 
      ORDER BY sequence ASC
    `).all(jobId, sinceSequence) as any[];
  }
}

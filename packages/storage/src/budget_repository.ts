import type { Database } from 'better-sqlite3';
import crypto from 'crypto';

export class BudgetRepository {
  constructor(private db: Database) {}

  /**
   * Reads the current snapshot id for a given provider/model, if active.
   * If not found or expired, returns null.
   */
  getActivePriceSnapshot(provider: string, modelId: string): any {
    return this.db.prepare(`
      SELECT * FROM price_snapshots 
      WHERE provider = ? AND model_id = ? 
      ORDER BY valid_until DESC LIMIT 1
    `).get(provider, modelId) as any;
  }

  /**
   * Initializes a budget account (for testing or job creation)
   */
  createBudgetAccount(id: string, capEurMicro: number = 2000000) {
    this.db.prepare(`
      INSERT INTO budget_accounts (id, cap_eur_micro, settled_eur_micro, reserved_eur_micro, uncertain_eur_micro)
      VALUES (?, ?, 0, 0, 0)
    `).run(id, capEurMicro);
  }

  /**
   * Books a reservation in the ledger.
   * Atomic invariant: S + R + U + estimatedCost <= C
   */
  prepareCall(
    accountId: string, 
    taskId: string, 
    requestHash: string, 
    model: string, 
    priceSnapshotId: string, 
    estimatedCostMicro: number
  ): { ok: boolean, callId?: string, error?: string } {
    return this.db.transaction(() => {
      // BEGIN IMMEDIATE is implied by db.transaction in WAL if we do a write,
      // but to be absolutely sure we read and write in the same tx:
      const account = this.db.prepare(`
        SELECT cap_eur_micro, settled_eur_micro, reserved_eur_micro, uncertain_eur_micro 
        FROM budget_accounts 
        WHERE id = ?
      `).get(accountId) as any;

      if (!account) return { ok: false, error: 'Account not found' };

      const totalCommitted = account.settled_eur_micro + account.reserved_eur_micro + account.uncertain_eur_micro;
      if (totalCommitted + estimatedCostMicro > account.cap_eur_micro) {
        return { ok: false, error: 'BUDGET_EXCEEDED' };
      }

      // Update budget_accounts
      this.db.prepare(`
        UPDATE budget_accounts 
        SET reserved_eur_micro = reserved_eur_micro + ? 
        WHERE id = ?
      `).run(estimatedCostMicro, accountId);

      // Create provider_call
      const callId = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO provider_calls (id, task_id, request_hash, model, price_snapshot_id, status)
        VALUES (?, ?, ?, ?, ?, 'PREPARED')
      `).run(callId, taskId, requestHash, model, priceSnapshotId);

      // Log entry
      this.logBudgetEntry(callId, 'PREPARED', { reserved: estimatedCostMicro });

      return { ok: true, callId };
    })();
  }

  /**
   * Transitions PREPARED -> DISPATCHING
   */
  dispatchCall(callId: string) {
    const info = this.db.prepare(`UPDATE provider_calls SET status = 'DISPATCHING' WHERE id = ? AND status = 'PREPARED'`).run(callId);
    if (info.changes === 0) throw new Error('Invalid state transition to DISPATCHING');
    this.logBudgetEntry(callId, 'DISPATCHING', {});
  }

  /**
   * Transitions DISPATCHING -> SETTLED
   */
  settleCall(accountId: string, callId: string, reservedCostMicro: number, actualCostMicro: number) {
    this.db.transaction(() => {
      const info = this.db.prepare(`UPDATE provider_calls SET status = 'SETTLED' WHERE id = ? AND status = 'DISPATCHING'`).run(callId);
      if (info.changes === 0) throw new Error('Invalid state transition to SETTLED');

      this.db.prepare(`
        UPDATE budget_accounts 
        SET reserved_eur_micro = reserved_eur_micro - ?,
            settled_eur_micro = settled_eur_micro + ?
        WHERE id = ?
      `).run(reservedCostMicro, actualCostMicro, accountId);

      this.logBudgetEntry(callId, 'SETTLED', { reservedDelta: -reservedCostMicro, settledDelta: actualCostMicro });
    })();
  }

  /**
   * Transitions PREPARED/DISPATCHING -> NOT_SENT
   */
  cancelCall(accountId: string, callId: string, reservedCostMicro: number) {
    this.db.transaction(() => {
      const info = this.db.prepare(`
        UPDATE provider_calls 
        SET status = 'NOT_SENT' 
        WHERE id = ? AND status IN ('PREPARED', 'DISPATCHING')
      `).run(callId);
      if (info.changes === 0) throw new Error('Invalid state transition to NOT_SENT');

      this.db.prepare(`
        UPDATE budget_accounts 
        SET reserved_eur_micro = reserved_eur_micro - ?
        WHERE id = ?
      `).run(reservedCostMicro, accountId);

      this.logBudgetEntry(callId, 'NOT_SENT', { reservedDelta: -reservedCostMicro });
    })();
  }

  /**
   * Transitions DISPATCHING -> UNCERTAIN
   */
  markCallUncertain(accountId: string, callId: string, reservedCostMicro: number) {
    this.db.transaction(() => {
      const info = this.db.prepare(`UPDATE provider_calls SET status = 'UNCERTAIN' WHERE id = ? AND status = 'DISPATCHING'`).run(callId);
      if (info.changes === 0) throw new Error('Invalid state transition to UNCERTAIN');

      this.db.prepare(`
        UPDATE budget_accounts 
        SET reserved_eur_micro = reserved_eur_micro - ?,
            uncertain_eur_micro = uncertain_eur_micro + ?
        WHERE id = ?
      `).run(reservedCostMicro, reservedCostMicro, accountId);

      this.logBudgetEntry(callId, 'UNCERTAIN', { reservedDelta: -reservedCostMicro, uncertainDelta: reservedCostMicro });
    })();
  }

  private logBudgetEntry(callId: string, eventType: string, amounts: any) {
    this.db.prepare(`
      INSERT INTO budget_entries (id, call_id, event_type, amounts_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), callId, eventType, JSON.stringify(amounts), new Date().toISOString());
  }
}

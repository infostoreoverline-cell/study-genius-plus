import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase } from '../../../packages/storage/src/database.js';
import { BudgetRepository } from '../../../packages/storage/src/budget_repository.js';
import { LedgerClient } from '../../../packages/budget/src/ledger.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

describe('Ledger and BudgetRepository', () => {
  let db: any;
  let repo: BudgetRepository;
  let ledger: LedgerClient;
  const dbPath = path.join(__dirname, 'test_budget.db');
  
  beforeEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
    
    db = getDatabase(dbPath);
    db.pragma('foreign_keys = OFF');
    repo = new BudgetRepository(db);
    ledger = new LedgerClient(repo);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
  });

  it('should initialize a budget account', () => {
    repo.createBudgetAccount('test-acc-1', 10000);
    const acc = db.prepare('SELECT * FROM budget_accounts WHERE id = ?').get('test-acc-1');
    expect(acc.cap_eur_micro).toBe(10000);
    expect(acc.settled_eur_micro).toBe(0);
    expect(acc.reserved_eur_micro).toBe(0);
    expect(acc.uncertain_eur_micro).toBe(0);
  });

  it('should successfully reserve and settle a call', () => {
    repo.createBudgetAccount('test-acc-2', 5000);
    const callId = ledger.reserve('test-acc-2', 'task-1', 'model-a', 1000); // requested 1000, margin adds 25% -> 1250

    const accAfterReserve = db.prepare('SELECT * FROM budget_accounts WHERE id = ?').get('test-acc-2');
    expect(accAfterReserve.reserved_eur_micro).toBe(1250);

    ledger.dispatch(callId);
    
    // settle with actual cost 1100
    ledger.settle('test-acc-2', callId, 1250, 1100);

    const accAfterSettle = db.prepare('SELECT * FROM budget_accounts WHERE id = ?').get('test-acc-2');
    expect(accAfterSettle.reserved_eur_micro).toBe(0);
    expect(accAfterSettle.settled_eur_micro).toBe(1100);
    
    const call = db.prepare('SELECT * FROM provider_calls WHERE id = ?').get(callId);
    expect(call.status).toBe('SETTLED');
  });

  it('should reject a reservation that exceeds the budget cap', () => {
    repo.createBudgetAccount('test-acc-3', 1000);
    
    expect(() => {
      ledger.reserve('test-acc-3', 'task-2', 'model-b', 1000); // 1000 * 1.25 = 1250 > 1000 cap
    }).toThrow(/BUDGET_EXCEEDED/);

    const acc = db.prepare('SELECT * FROM budget_accounts WHERE id = ?').get('test-acc-3');
    expect(acc.reserved_eur_micro).toBe(0); // unaltered
  });

  it('should transition a call to NOT_SENT and release budget', () => {
    repo.createBudgetAccount('test-acc-4', 5000);
    const callId = ledger.reserve('test-acc-4', 'task-3', 'model-c', 2000); // 2500 with margin
    
    ledger.cancel('test-acc-4', callId, 2500);
    
    const acc = db.prepare('SELECT * FROM budget_accounts WHERE id = ?').get('test-acc-4');
    expect(acc.reserved_eur_micro).toBe(0);
    
    const call = db.prepare('SELECT * FROM provider_calls WHERE id = ?').get(callId);
    expect(call.status).toBe('NOT_SENT');
  });
});

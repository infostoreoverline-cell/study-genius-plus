import type { BudgetRepository } from '../../storage/src/budget_repository.js';

export class LedgerClient {
  constructor(private repo: BudgetRepository) {}

  /**
   * Prepares a call, ensuring budget constraints are met.
   * Calculates the estimated cost and returns a callId to be dispatched.
   */
  reserve(accountId: string, taskId: string, model: string, estimatedMicroEur: number): string {
    // In a real system, we'd lookup the price snapshot. Here we mock it.
    const snapshotId = `snap-${model}-mock`; 

    // Add a 25% safety margin
    const withMargin = Math.ceil(estimatedMicroEur * 1.25);

    const result = this.repo.prepareCall(accountId, taskId, 'mock-hash', model, snapshotId, withMargin);
    if (!result.ok || !result.callId) {
      throw new Error(`Reservation failed: ${result.error}`);
    }

    return result.callId;
  }

  /**
   * Marks the call as dispatched (about to send over the network).
   */
  dispatch(callId: string) {
    this.repo.dispatchCall(callId);
  }

  /**
   * Settles a call after successful response.
   */
  settle(accountId: string, callId: string, reservedMicroEur: number, actualMicroEur: number) {
    this.repo.settleCall(accountId, callId, reservedMicroEur, actualMicroEur);
  }

  /**
   * Cancels a call that was not sent.
   */
  cancel(accountId: string, callId: string, reservedMicroEur: number) {
    this.repo.cancelCall(accountId, callId, reservedMicroEur);
  }

  /**
   * Marks a call as uncertain (e.g. timeout without known response).
   */
  markUncertain(accountId: string, callId: string, reservedMicroEur: number) {
    this.repo.markCallUncertain(accountId, callId, reservedMicroEur);
  }
}

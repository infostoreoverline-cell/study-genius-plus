import type { AiRequest, AiResult, ProviderAdapter } from '../../../contracts/src/providers.js';
import type { LedgerClient } from '../../../packages/budget/src/ledger.js';
import { SecretStore } from './secret_store.js';
import { GoogleAdapter } from './adapters/google.js';
import { DeepSeekAdapter } from './adapters/deepseek.js';
import { getDatabase } from '../../../packages/storage/src/database.js';

export class AiGateway {
  private secretStore = new SecretStore();
  private adapters: Record<string, ProviderAdapter> = {
    'google': new GoogleAdapter(),
    'deepseek': new DeepSeekAdapter()
  };

  constructor(private ledger: LedgerClient, private dbPath: string) {}

  async execute(req: AiRequest): Promise<AiResult> {
    const db = getDatabase(this.dbPath);

    // 1. Resolve account
    const account = db.prepare('SELECT provider, credential_ref FROM provider_accounts WHERE id = ?').get(req.accountId) as any;
    if (!account) {
      throw new Error('Provider account not found');
    }

    const adapter = this.adapters[account.provider];
    if (!adapter) {
      throw new Error(`Unsupported provider: ${account.provider}`);
    }

    // 2. Load secret
    let secret: string;
    try {
      secret = await this.secretStore.get(account.credential_ref);
    } catch (err: any) {
      throw new Error(`Failed to unprotect credentials: ${err.message}`);
    }

    // 3. Estimate cost and reserve budget
    // Naive estimation for now: ideally we would check price_snapshots
    const estimatedCost = 2500; // micro-EUR
    const callId = this.ledger.reserve(req.budgetAccountId, req.taskId || 'no-task', req.modelId, estimatedCost);
    this.ledger.dispatch(callId);

    // 4. Execute
    let result: AiResult;
    try {
      result = await adapter.execute(req, secret);
    } catch (err: any) {
      // 5. Cancel budget on fatal transport error
      this.ledger.cancel(req.budgetAccountId, callId, estimatedCost);
      throw err;
    }

    // 6. Settle budget
    if (result.error && result.error.includes('429')) {
      this.ledger.markUncertain(req.budgetAccountId, callId, estimatedCost);
    } else if (result.error) {
      this.ledger.cancel(req.budgetAccountId, callId, estimatedCost);
    } else {
      // Naive settlement: assume 1 token = 1 micro-EUR
      const actualCost = result.usage.totalTokens; 
      this.ledger.settle(req.budgetAccountId, callId, estimatedCost, actualCost);
    }

    return result;
  }
}

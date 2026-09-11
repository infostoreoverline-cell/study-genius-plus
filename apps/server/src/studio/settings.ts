import { SecretStore } from '../../../../packages/providers/src/secret_store.js';
import type { Database } from 'better-sqlite3';
import type { StudioProvider } from './generator.js';

const secretStore = new SecretStore();

export async function getProviderKey(db: Database, provider: 'gemini' | 'deepseek'): Promise<string | null> {
  const account = db.prepare('SELECT id, credential_ref FROM provider_accounts WHERE provider = ?').get(provider) as { id: string, credential_ref: string } | undefined;
  if (!account || !account.credential_ref) return null;
  
  try {
    return await secretStore.get(account.credential_ref);
  } catch (error) {
    console.error(`Failed to decrypt key for ${provider}:`, error);
    return null;
  }
}

export async function getSettings(db: Database) {
  const geminiKey = await getProviderKey(db, 'gemini');
  const deepseekKey = await getProviderKey(db, 'deepseek');
  const isDemo = !geminiKey || !deepseekKey;
  const provider: StudioProvider = isDemo ? 'demo' : 'deepseek';

  return {
    isDemo,
    geminiKey,
    deepseekKey,
    provider,
    model: isDemo ? 'demo' : 'deepseek-chat',
  };
}

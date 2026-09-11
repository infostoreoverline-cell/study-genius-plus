import { Router, Request, Response } from 'express';
import { getDatabase } from '../../../../../packages/storage/src/database.js';
import { SecretStore } from '../../../../../packages/providers/src/secret_store.js';
import crypto from 'crypto';

export function createSettingsRouter(dbPath: string) {
  const router = Router();
  const secretStore = new SecretStore();

  router.get('/settings', (req: Request, res: Response) => {
    const db = getDatabase(dbPath);
    const accounts = db.prepare('SELECT provider FROM provider_accounts').all() as { provider: string }[];
    
    const configuredProviders = accounts.map(a => a.provider);
    const geminiConfigured = configuredProviders.includes('gemini');
    const deepseekConfigured = configuredProviders.includes('deepseek');
    
    res.json({
      configured: geminiConfigured && deepseekConfigured,
      geminiConfigured,
      deepseekConfigured,
      source: 'database'
    });
  });

  router.post('/settings', async (req: Request, res: Response): Promise<void> => {
    try {
      const { geminiKey, deepseekKey } = req.body;
      const db = getDatabase(dbPath);
      
      const saveKey = async (provider: string, secret: string) => {
        if (!secret || secret.trim().length < 5) return;
        // Upsert logic
        const existing = db.prepare('SELECT id FROM provider_accounts WHERE provider = ?').get(provider) as { id: string } | undefined;
        let accountId = existing?.id;
        
        if (!accountId) {
          accountId = crypto.randomUUID();
        }
        
        const encryptedBase64 = await secretStore.put(accountId, secret.trim());
        const version = new Date().toISOString();

        if (existing) {
          db.prepare(`UPDATE provider_accounts SET credential_ref = ?, credential_version = ? WHERE id = ?`)
            .run(encryptedBase64, version, accountId);
        } else {
          db.prepare(`
            INSERT INTO provider_accounts (id, provider, label, quota_group_id, credential_ref, credential_version)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(accountId, provider, provider, 'default-quota', encryptedBase64, version);
        }
      };

      if (geminiKey) await saveKey('gemini', geminiKey);
      if (deepseekKey) await saveKey('deepseek', deepseekKey);

      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

import { Router, Request, Response } from 'express';
import { getDatabase } from '../../../../../packages/storage/src/database.js';
import { SecretStore } from '../../../../../packages/providers/src/secret_store.js';
import crypto from 'crypto';

export function createSettingsRouter(dbPath: string) {
  const router = Router();
  const secretStore = new SecretStore();

  router.post('/keys', async (req: Request, res: Response): Promise<void> => {
    try {
      const { provider, secret, label } = req.body;
      if (!provider || !secret || secret.trim().length < 5) {
        res.status(400).json({ error: 'Invalid secret payload' });
        return;
      }

      const db = getDatabase(dbPath);
      
      const accountId = crypto.randomUUID();
      const encryptedBase64 = await secretStore.put(accountId, secret);
      const version = new Date().toISOString();

      db.prepare(`
        INSERT INTO provider_accounts (id, provider, label, quota_group_id, credential_ref, credential_version)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, provider, label || provider, 'default-quota', encryptedBase64, version);

      res.status(201).json({ success: true, accountId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/keys/status', (req: Request, res: Response) => {
    const db = getDatabase(dbPath);
    const accounts = db.prepare('SELECT id, provider, label, credential_version FROM provider_accounts').all();
    res.json(accounts);
  });

  return router;
}

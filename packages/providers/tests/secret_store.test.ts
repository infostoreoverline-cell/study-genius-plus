import { describe, it, expect } from 'vitest';
import { SecretStore } from '../src/secret_store.js';

describe('SecretStore DPAPI', () => {
  it('should encrypt and decrypt a secret', async () => {
    const store = new SecretStore();
    const mySecret = 'test-secret-123!@#';
    
    // Encrypt
    const encryptedBase64 = await store.put('some-id', mySecret);
    expect(encryptedBase64).toBeTruthy();
    expect(encryptedBase64).not.toContain(mySecret);
    
    // Decrypt
    const decrypted = await store.get(encryptedBase64);
    expect(decrypted).toBe(mySecret);
  });
});

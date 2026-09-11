import { test } from 'node:test';
import assert from 'node:assert';
import { BlobStore } from '../../../packages/storage/src/blob_store.js';
import { rmdirSync, existsSync } from 'fs';

test('blob store put and get', () => {
  const basePath = './test-blobs';
  const store = new BlobStore(basePath);
  
  const content = Buffer.from('hello world');
  const hash = store.put(content);
  
  assert.strictEqual(hash, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  
  const retrieved = store.get(hash);
  assert.ok(retrieved);
  assert.strictEqual(retrieved.toString(), 'hello world');
  
  // Cleanup
  if (existsSync(basePath)) {
    rmdirSync(basePath, { recursive: true });
  }
});

import dpapi from 'win-dpapi';
import fs from 'fs';

const secret = 'this_is_a_fictional_api_key_123';
const entropy = 'study-genius-entropy';

try {
  const encrypted = dpapi.protectData(Buffer.from(secret, 'utf8'), Buffer.from(entropy, 'utf8'), 'CurrentUser');
  fs.writeFileSync('secret.bin', encrypted);
  console.log('Secret encrypted and saved to secret.bin');

  const readEncrypted = fs.readFileSync('secret.bin');
  const decrypted = dpapi.unprotectData(readEncrypted, Buffer.from(entropy, 'utf8'), 'CurrentUser');
  console.log('Decrypted secret:', decrypted.toString('utf8'));
  
  if (decrypted.toString('utf8') === secret) {
    console.log('DPAPI test passed!');
  } else {
    console.error('DPAPI test failed: mismatched secret');
  }
} catch (e) {
  console.error('DPAPI test failed with error:', e);
}

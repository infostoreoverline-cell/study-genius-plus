import { spawn } from 'child_process';

export class SecretStore {
  /**
   * Encrypts a secret using Windows DPAPI (CurrentUser scope) via PowerShell.
   * Returns the Base64 encoded encrypted string.
   */
  async put(providerAccountId: string, secret: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const script = `
        Add-Type -AssemblyName System.Security
        $inputText = [Console]::In.ReadToEnd()
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($inputText)
        $encrypted = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        [Convert]::ToBase64String($encrypted)
      `;
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');

      const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript]);
      
      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ps.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`DPAPI Encrypt failed with code ${code}: ${errorOutput}`));
        } else {
          resolve(output.trim());
        }
      });

      ps.stdin.write(secret);
      ps.stdin.end();
    });
  }

  /**
   * Decrypts a Base64 encoded encrypted string using Windows DPAPI.
   */
  async get(encryptedBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const script = `
        Add-Type -AssemblyName System.Security
        $inputText = [Console]::In.ReadToEnd()
        $bytes = [Convert]::FromBase64String($inputText)
        $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        [System.Text.Encoding]::UTF8.GetString($decrypted)
      `;
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');

      const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript]);
      
      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ps.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`DPAPI Decrypt failed with code ${code}: ${errorOutput}`));
        } else {
          resolve(output.trim());
        }
      });

      ps.stdin.write(encryptedBase64);
      ps.stdin.end();
    });
  }
}

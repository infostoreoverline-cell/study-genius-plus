import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export class BlobStore {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  public put(content: Buffer): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const path = join(this.basePath, hash);
    if (!existsSync(path)) {
      writeFileSync(path, content);
    }
    return hash;
  }

  public get(hash: string): Buffer | null {
    const path = join(this.basePath, hash);
    if (existsSync(path)) {
      return readFileSync(path);
    }
    return null;
  }

  public getPath(hash: string): string | null {
    const path = join(this.basePath, hash);
    if (existsSync(path)) {
      return path;
    }
    return null;
  }
}

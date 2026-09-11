import { createServer } from './http/server.js';
import { createServer as createHttpServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDatabase } from '../../../packages/storage/src/database.js';

function run(): void {
  loadLocalEnv(join(process.cwd(), '.env'));
  const dataDirectory = process.env.STUDY_GENIUS_DATA_DIR
    ? join(process.cwd(), process.env.STUDY_GENIUS_DATA_DIR)
    : join(process.cwd(), '.study-genius');
  const port = parsePort(process.env.PORT);
  const lockFile = join(dataDirectory, 'server.lock');
  mkdirSync(dataDirectory, { recursive: true });
  acquireLock(lockFile);

  const db = getDatabase(join(dataDirectory, 'study-genius.sqlite'));
  const app = createServer(db, join(dataDirectory, 'blobs'));
  const server = createHttpServer(app);

  const shutdown = () => {
    server.close(() => {
      db.close();
      releaseLock(lockFile);
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', () => releaseLock(lockFile));

  server.listen(port, '127.0.0.1', () => {
    console.log(`StudyGenius+ server avviato su http://127.0.0.1:${port}`);
    console.log(`Dati locali: ${dataDirectory}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`La porta ${port} e gia in uso. Chiudi l'altro server oppure avvia con PORT=3001.`);
      releaseLock(lockFile);
      process.exit(1);
    }
    throw error;
  });
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 3000);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : 3000;
}

function loadLocalEnv(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/gu)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/u.test(key) || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^(?:"(.*)"|'(.*)')$/u, '$1$2');
  }
}

function acquireLock(filePath: string): void {
  if (existsSync(filePath)) {
    const oldPid = Number(readFileSync(filePath, 'utf8').trim());
    if (Number.isInteger(oldPid) && oldPid > 0 && isRunning(oldPid)) {
      console.error('StudyGenius+ e gia in esecuzione. Chiudi il server esistente prima di avviarne un altro.');
      process.exit(1);
    }
    unlinkSync(filePath);
  }
  writeFileSync(filePath, String(process.pid), { encoding: 'utf8', flag: 'wx' });
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function releaseLock(filePath: string): void {
  try {
    if (existsSync(filePath) && readFileSync(filePath, 'utf8').trim() === String(process.pid)) {
      unlinkSync(filePath);
    }
  } catch {
    // A stale lock is handled safely on the next launch.
  }
}

run();

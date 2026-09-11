import { createServer } from './http/server.js';
import { getBootstrapToken } from './http/auth.js';
import { createServer as createHttpServer } from 'http';
import fs from 'fs';
import { getDatabase } from '../../../packages/storage/src/database.js';
import { JobRepository } from '../../../packages/storage/src/job_repository.js';
import { BudgetRepository } from '../../../packages/storage/src/budget_repository.js';
import { LedgerClient } from '../../../packages/budget/src/ledger.js';
import { AiGateway } from '../../../packages/providers/src/gateway.js';
import { Dispatcher } from './worker/dispatcher.js';
import { join } from 'path';

const PORT = 3000;
const LOCK_FILE = './app.lock';
const DB_PATH = join(process.cwd(), 'local_dev.db');

function run() {
  if (fs.existsSync(LOCK_FILE)) {
    console.error('App is already running! (Lock file exists).');
    process.exit(1);
  }

  // Create lock
  fs.writeFileSync(LOCK_FILE, process.pid.toString());
  
  process.on('exit', () => {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  });
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1); // M03 requires closing on uncaughtException safely
  });

  const db = getDatabase(DB_PATH);
  const repo = new JobRepository(db);
  const budgetRepo = new BudgetRepository(db);
  const ledger = new LedgerClient(budgetRepo);
  const gateway = new AiGateway(ledger, DB_PATH);
  
  const dispatcher = new Dispatcher(repo, ledger, gateway);
  dispatcher.start();

  const app = createServer(db);
  const server = createHttpServer(app);

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server listening on http://127.0.0.1:${PORT}`);
    console.log(`Bootstrap token: ${getBootstrapToken()}`);
  });
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use. Is another instance running?`);
      process.exit(1);
    }
    throw err;
  });
}

run();

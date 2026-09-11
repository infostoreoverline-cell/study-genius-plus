import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';

const dbPath = './test.db';
const backupPath = './backup.db';

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE test_table (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

const insert = db.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)');
const id1 = randomUUID();

const runTx = db.transaction(() => {
  insert.run(id1, 'value1');
});

runTx();

console.log('Transaction committed. Data count:', db.prepare('SELECT COUNT(*) as c FROM test_table').get());

// Backup
db.backup(backupPath).then(() => {
  console.log('Backup successful.');
  const backupDb = new Database(backupPath);
  console.log('Data in backup:', backupDb.prepare('SELECT COUNT(*) as c FROM test_table').get());
  backupDb.close();
  db.close();
}).catch(console.error);

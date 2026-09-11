import Database from 'better-sqlite3';
import { Migrator } from './migrator.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  const migrator = new Migrator(db, join(__dirname, 'migrations'));
  migrator.migrate();
  
  return db;
}

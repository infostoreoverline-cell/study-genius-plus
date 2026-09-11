import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export class Migrator {
  private db: Database.Database;
  private migrationsPath: string;

  constructor(db: Database.Database, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
  }

  public migrate() {
    this.db.pragma('journal_mode = WAL');
    
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedMigrations = this.db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
    const appliedSet = new Set(appliedMigrations.map(m => m.name));

    const migrationFiles = readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      if (!appliedSet.has(file)) {
        console.log(`Applying migration: ${file}`);
        const sql = readFileSync(join(this.migrationsPath, file), 'utf-8');
        
        // Execute migration inside a transaction
        const runMigration = this.db.transaction(() => {
          this.db.exec(sql);
          this.db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
        });

        runMigration();
      }
    }
  }
}

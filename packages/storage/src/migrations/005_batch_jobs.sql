CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL, /* 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED' */
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  master_output_id TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS batch_job_items (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL, /* 'PENDING', 'EXTRACTING', 'SYNTHESIZING', 'SVG', 'COMPLETED', 'FAILED' */
  gemini_evidence_json TEXT,
  deepseek_summary TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Table to track imported sources (files)
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  blob_id TEXT NOT NULL,
  status TEXT DEFAULT 'PROCESSING', -- PROCESSING, READY, FAILED
  anomalies_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table to track individual pages or segments from a source
CREATE TABLE IF NOT EXISTS source_pages (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  unit_index TEXT NOT NULL, -- e.g. "page_1"
  original_text TEXT,
  normalized_text TEXT,
  quality TEXT DEFAULT 'unknown', -- good, ocr_needed, excluded, unknown
  needs_review BOOLEAN DEFAULT 0,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_sources_project ON sources(project_id);
CREATE INDEX IF NOT EXISTS idx_sources_hash ON sources(file_hash);
CREATE INDEX IF NOT EXISTS idx_source_pages_source ON source_pages(source_id);

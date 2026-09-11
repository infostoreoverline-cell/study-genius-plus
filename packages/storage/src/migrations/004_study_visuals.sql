-- Visual study aids generated from the local, extracted source text.
CREATE TABLE IF NOT EXISTS study_visuals (
  id TEXT PRIMARY KEY,
  output_id TEXT NOT NULL REFERENCES study_outputs(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  svg TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  caption TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_visuals_output ON study_visuals(output_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_study_visuals_project ON study_visuals(project_id, created_at DESC);

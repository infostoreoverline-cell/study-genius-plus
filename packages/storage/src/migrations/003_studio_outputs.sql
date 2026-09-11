-- A small, user-facing archive for the first usable StudyGenius+ workflow.
CREATE TABLE IF NOT EXISTS study_outputs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_outputs_project ON study_outputs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_outputs_source ON study_outputs(source_id, created_at DESC);

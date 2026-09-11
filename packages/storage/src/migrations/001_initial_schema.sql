-- SQLite Migration 001 - Initial Schema

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject_profile_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- subject_profiles
CREATE TABLE subject_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  discipline TEXT NOT NULL,
  revision_id TEXT NOT NULL
);

-- profile_revisions
CREATE TABLE profile_revisions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  instructions_json TEXT NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES subject_profiles(id) ON DELETE CASCADE
);

-- documents
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  blob_hash TEXT NOT NULL,
  byte_size INTEGER NOT NULL
);

-- project_documents
CREATE TABLE project_documents (
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  selected_ranges_json TEXT,
  PRIMARY KEY (project_id, document_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- source_selection_revisions
CREATE TABLE source_selection_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  selection_json TEXT NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- generation_requests
CREATE TABLE generation_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  request_json TEXT NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- source_units
CREATE TABLE source_units (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  page_index INTEGER NOT NULL,
  kind TEXT NOT NULL,
  text TEXT,
  bbox_json TEXT,
  hash TEXT NOT NULL,
  extraction_status TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- source_evidence
CREATE TABLE source_evidence (
  id TEXT PRIMARY KEY,
  source_unit_id TEXT NOT NULL,
  representation_json TEXT NOT NULL,
  provenance TEXT NOT NULL,
  uncertainties_json TEXT,
  FOREIGN KEY (source_unit_id) REFERENCES source_units(id) ON DELETE CASCADE
);

-- jobs
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  request_revision_id TEXT NOT NULL,
  status TEXT NOT NULL,
  stage TEXT NOT NULL,
  budget_account_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (request_revision_id) REFERENCES generation_requests(id) ON DELETE CASCADE
);

-- tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  lease_owner TEXT,
  lease_until TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- task_dependencies
CREATE TABLE task_dependencies (
  task_id TEXT NOT NULL,
  dependency_task_id TEXT NOT NULL,
  PRIMARY KEY (task_id, dependency_task_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (dependency_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- job_events
CREATE TABLE job_events (
  job_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (job_id, sequence),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- plans
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  json TEXT NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- concepts
CREATE TABLE concepts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content_json TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- concept_edges
CREATE TABLE concept_edges (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id, relation),
  FOREIGN KEY (from_id) REFERENCES concepts(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES concepts(id) ON DELETE CASCADE
);

-- chapter_revisions
CREATE TABLE chapter_revisions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  ast_json TEXT NOT NULL,
  hash TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE (job_id, chapter_id, revision),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- block_revisions
CREATE TABLE block_revisions (
  id TEXT PRIMARY KEY,
  chapter_revision_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  ast_pointer TEXT NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (chapter_revision_id) REFERENCES chapter_revisions(id) ON DELETE CASCADE
);

-- block_sources
CREATE TABLE block_sources (
  block_revision_id TEXT NOT NULL,
  source_unit_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  PRIMARY KEY (block_revision_id, source_unit_id, relation),
  FOREIGN KEY (block_revision_id) REFERENCES block_revisions(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES source_units(id) ON DELETE CASCADE
);

-- document_revisions
CREATE TABLE document_revisions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  chapter_revision_ids_json TEXT NOT NULL,
  assembly_json TEXT NOT NULL,
  hash TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- visual_revisions
CREATE TABLE visual_revisions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  visual_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  spec_json TEXT NOT NULL,
  spec_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  UNIQUE(job_id, visual_id, revision),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- artifacts
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  blob_hash TEXT,
  producer_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE(kind, input_hash, producer_version)
);

-- artifact_dependencies
CREATE TABLE artifact_dependencies (
  artifact_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  dependency_id TEXT NOT NULL,
  dependency_hash TEXT NOT NULL,
  PRIMARY KEY (artifact_id, dependency_id, dependency_type),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

-- review_reports
CREATE TABLE review_reports (
  id TEXT PRIMARY KEY,
  target_revision_id TEXT NOT NULL,
  target_hash TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  verdict TEXT NOT NULL,
  findings_json TEXT NOT NULL
);

-- exports
CREATE TABLE exports (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  document_revision_id TEXT NOT NULL,
  format TEXT NOT NULL,
  artifact_id TEXT,
  status TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (document_revision_id) REFERENCES document_revisions(id) ON DELETE CASCADE,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL
);

-- provider_accounts
CREATE TABLE provider_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  quota_group_id TEXT NOT NULL,
  credential_ref TEXT NOT NULL,
  credential_version TEXT NOT NULL
);

-- model_catalog
CREATE TABLE model_catalog (
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  version TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  PRIMARY KEY (provider, model_id, version)
);

-- price_snapshots
CREATE TABLE price_snapshots (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  version TEXT NOT NULL,
  tariffs_json TEXT NOT NULL,
  validity TEXT NOT NULL
);

-- budget_accounts
CREATE TABLE budget_accounts (
  id TEXT PRIMARY KEY,
  cap_eur_micro INTEGER NOT NULL DEFAULT 0 CHECK (cap_eur_micro >= 0),
  settled_eur_micro INTEGER NOT NULL DEFAULT 0 CHECK (settled_eur_micro >= 0),
  reserved_eur_micro INTEGER NOT NULL DEFAULT 0 CHECK (reserved_eur_micro >= 0),
  uncertain_eur_micro INTEGER NOT NULL DEFAULT 0 CHECK (uncertain_eur_micro >= 0)
);

-- provider_calls
CREATE TABLE provider_calls (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  price_snapshot_id TEXT NOT NULL,
  status TEXT NOT NULL,
  usage_json TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (price_snapshot_id) REFERENCES price_snapshots(id)
);

-- budget_entries
CREATE TABLE budget_entries (
  id TEXT PRIMARY KEY,
  call_id TEXT,
  event_type TEXT NOT NULL,
  amounts_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (call_id) REFERENCES provider_calls(id) ON DELETE SET NULL
);

-- settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  value_json TEXT NOT NULL
);

-- backups
CREATE TABLE backups (
  id TEXT PRIMARY KEY,
  manifest_hash TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

-- idempotency_records
CREATE TABLE idempotency_records (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scope, key)
);

-- local_sessions
CREATE TABLE local_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

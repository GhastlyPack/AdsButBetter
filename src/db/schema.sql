CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  daily_budget REAL NOT NULL,
  lifetime_budget REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  entity_level TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  spend REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  cpc REAL NOT NULL DEFAULT 0,
  cpa REAL NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_metrics_entity ON metrics_snapshots(entity_id, timestamp);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  entity_level TEXT NOT NULL,
  conditions TEXT NOT NULL,       -- JSON array
  action TEXT NOT NULL,
  action_params TEXT NOT NULL,    -- JSON object
  priority INTEGER NOT NULL DEFAULT 0,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  entity_level TEXT NOT NULL,
  action TEXT NOT NULL,
  action_params TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT NOT NULL,
  triggered_rule_ids TEXT NOT NULL,  -- JSON array
  status TEXT NOT NULL DEFAULT 'pending',
  discord_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);

CREATE TABLE IF NOT EXISTS decision_logs (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_level TEXT NOT NULL,
  action TEXT NOT NULL,
  action_params TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT NOT NULL,
  triggered_rule_ids TEXT NOT NULL,
  resolved_by TEXT,
  metrics_before TEXT NOT NULL,     -- JSON object
  metrics_after TEXT,               -- JSON object
  executed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  raw_word TEXT NOT NULL,
  ip_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_word ON submissions(word);
CREATE INDEX IF NOT EXISTS idx_ip_time ON submissions(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('paused', '0');

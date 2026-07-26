CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  card_type TEXT NOT NULL CHECK (card_type IN ('person', 'opportunity', 'intelligence', 'idea')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_platform TEXT NOT NULL DEFAULT 'other',
  source_url TEXT,
  source_text TEXT,
  ocr_text TEXT,
  image_url TEXT,
  importance_reason TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'inbox',
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  analysis_result TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

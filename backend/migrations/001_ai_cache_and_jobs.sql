-- ============================================================
-- Migration: Add content_hash caching + async analysis jobs
-- Safe: non-destructive, additive-only changes to ai_analysis.
-- ============================================================

-- Step 1: Add content_hash to ai_analysis table.
-- Stores SHA-256 of (title || '::' || description || '::' || category)
-- at the time the analysis was generated.
ALTER TABLE ai_analysis
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_cached BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Index for fast cache lookups (ticket_id + hash).
CREATE INDEX IF NOT EXISTS idx_ai_analysis_ticket_hash
  ON ai_analysis (ticket_id, content_hash);

-- Step 3: Create ai_analysis_jobs table for async background processing.
-- Uses a simple status machine: pending -> running -> completed | failed
CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timed_out')),
  analysis_id  INTEGER REFERENCES ai_analysis(id) ON DELETE SET NULL,
  error_msg    TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at   TIMESTAMP,
  completed_at TIMESTAMP
);

-- Step 4: Indexes for job polling and deduplication.
CREATE INDEX IF NOT EXISTS idx_ai_jobs_ticket_hash
  ON ai_analysis_jobs (ticket_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status
  ON ai_analysis_jobs (status, created_at);

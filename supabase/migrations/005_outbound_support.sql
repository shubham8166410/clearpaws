-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Phase 5 outbound pet travel support
-- Adds direction, destination_country to timelines table.
-- Makes origin_country and daff_group nullable to support outbound rows.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add direction column (default 'inbound' so existing rows are unchanged)
ALTER TABLE timelines
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound'
  CHECK (direction IN ('inbound', 'outbound'));

-- Add destination_country (null for inbound rows)
ALTER TABLE timelines
  ADD COLUMN IF NOT EXISTS destination_country text;

-- Make origin_country and daff_group nullable (outbound rows have no origin/group)
ALTER TABLE timelines
  ALTER COLUMN origin_country DROP NOT NULL;

ALTER TABLE timelines
  ALTER COLUMN daff_group DROP NOT NULL;

-- Index for filtering by direction
CREATE INDEX IF NOT EXISTS timelines_direction_idx ON timelines(direction);

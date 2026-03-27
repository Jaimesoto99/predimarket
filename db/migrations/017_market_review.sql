-- ============================================================
-- Migration 017 — Market Review Window
-- Run in Supabase SQL Editor.
-- ============================================================
-- Adds a review_status and review_token to the markets table
-- to support the 24-hour supervised creation workflow.

-- Add review_status: pending_review → approved | withdrawn
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending_review';

-- Add one-time token for email action links (approve / withdraw)
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS review_token uuid DEFAULT gen_random_uuid();

-- All markets created before this migration are considered approved
UPDATE markets
  SET review_status = 'approved'
  WHERE review_status = 'pending_review';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_markets_review_status ON markets(review_status);
CREATE INDEX IF NOT EXISTS idx_markets_review_token  ON markets(review_token);

COMMENT ON COLUMN markets.review_status IS
  'pending_review: awaiting admin review (hidden from users) | approved: visible | withdrawn: removed';
COMMENT ON COLUMN markets.review_token IS
  'One-time UUID for email action links (approve/withdraw). Regenerated on each review.';

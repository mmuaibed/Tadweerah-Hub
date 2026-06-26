-- Phase CLT-1: Flexible Offer Window Foundation
-- Adds offer_deadline to waste_listings and backfills all existing rows.
-- After backfill, enforces NOT NULL — every listing must have an offer deadline.

-- Step 1: Add column (nullable initially for backfill)
ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "offer_deadline" TIMESTAMPTZ;

-- Step 2: Backfill existing rows
-- Closed listings: use closed_at if available, otherwise created_at
-- Open listings: 7 days from now (staging/test data only)
UPDATE "waste_listings"
SET "offer_deadline" = CASE
  WHEN "status" != 'open' AND "closed_at" IS NOT NULL THEN "closed_at"
  WHEN "status" != 'open' THEN "created_at"
  ELSE now() + interval '7 days'
END
WHERE "offer_deadline" IS NULL;

-- Step 3: Enforce NOT NULL
ALTER TABLE "waste_listings" ALTER COLUMN "offer_deadline" SET NOT NULL;

-- SIR-3B: Add company logo URL column
-- Adds a nullable text column to store the public GCS URL of the company's logo.
-- Existing rows are unaffected (default NULL).
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_url" text;

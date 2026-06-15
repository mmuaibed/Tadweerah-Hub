CREATE TABLE IF NOT EXISTS "admin_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "type" text NOT NULL,
  "area" text NOT NULL,
  "priority" text NOT NULL,
  "status" text NOT NULL,
  "source_label" text,
  "description" text,
  "internal_notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

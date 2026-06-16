ALTER TABLE "admin_findings"
ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM admin_findings
)
UPDATE admin_findings af
SET sort_order = ordered.rn
FROM ordered
WHERE af.id = ordered.id;

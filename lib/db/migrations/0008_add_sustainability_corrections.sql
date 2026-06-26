-- Migration: 0008_add_sustainability_corrections.sql
-- SIR-2D: Admin sustainability correction workflow
-- New tables: admin_notifications, sustainability_correction_requests
-- New columns: sustainability_allocations (source_allocation_id, superseded_by_allocation_id, superseded_at)

-- ── admin_notifications ─────────────────────────────────────────────────────
-- Separate from company-scoped notifications table.
-- No company_id FK — admin notifications are platform-global.
CREATE TABLE IF NOT EXISTS admin_notifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 TEXT NOT NULL,
  title_ar             TEXT NOT NULL,
  title_en             TEXT NOT NULL,
  body_ar              TEXT,
  body_en              TEXT,
  is_read              BOOLEAN NOT NULL DEFAULT false,
  related_entity_type  TEXT,
  related_entity_id    UUID,
  action_url           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at              TIMESTAMPTZ
);

-- ── sustainability_correction_requests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sustainability_correction_requests (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id             UUID NOT NULL REFERENCES sustainability_allocations(id) ON DELETE RESTRICT,
  received_line_id          UUID NOT NULL REFERENCES sustainability_received_lines(id) ON DELETE RESTRICT,

  reason                    TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'pending',

  requested_by_user_id      TEXT,
  requested_by_company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  requested_by_role         TEXT NOT NULL,

  resolved_by_user_id       TEXT,
  resolved_at               TIMESTAMPTZ,
  rejection_reason          TEXT,

  correction_allocation_id  UUID REFERENCES sustainability_allocations(id),

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sust_corr_req_status
  ON sustainability_correction_requests(status);

CREATE INDEX IF NOT EXISTS idx_sust_corr_req_allocation
  ON sustainability_correction_requests(allocation_id);

CREATE INDEX IF NOT EXISTS idx_sust_corr_req_company
  ON sustainability_correction_requests(requested_by_company_id);

-- Only one pending correction request per allocation (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sust_corr_req_pending_per_allocation
  ON sustainability_correction_requests (allocation_id)
  WHERE status = 'pending';

-- ── sustainability_allocations additions ────────────────────────────────────
ALTER TABLE sustainability_allocations
  ADD COLUMN IF NOT EXISTS source_allocation_id UUID
    REFERENCES sustainability_allocations(id),

  ADD COLUMN IF NOT EXISTS superseded_by_allocation_id UUID
    REFERENCES sustainability_allocations(id),

  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

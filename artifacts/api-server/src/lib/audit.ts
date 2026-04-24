/**
 * Thin wrapper for writing to the audit log.
 * Append-only — rows are never updated or deleted.
 *
 * Charter: action keys use dot notation (entity.verb), e.g. "listing.created".
 * Never use display labels in action keys.
 */
import { db, auditLogTable } from "@workspace/db";

export async function logAudit({
  userId,
  companyId,
  action,
  entityType,
  entityId,
  details,
}: {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      user_id: userId ?? null,
      company_id: companyId ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: details ?? null,
    });
  } catch {
    // Audit log failure must never surface to the caller.
    // Log to stderr for ops visibility only.
    console.error(`[audit] Failed to log action=${action}`, { entityType, entityId });
  }
}

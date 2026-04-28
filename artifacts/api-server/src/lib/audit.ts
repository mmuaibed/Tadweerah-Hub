/**
 * Thin wrapper for writing to the audit log.
 * Append-only — rows are never updated or deleted.
 *
 * Charter: action keys use dot notation (entity.verb), e.g. "listing.created".
 * Never use display labels in action keys.
 *
 * severity:
 *   "info"     — normal operations (default). Failure is silently swallowed.
 *   "warn"     — notable but non-critical failure. Logged to stderr, swallowed.
 *   "critical" — must succeed; failure is re-thrown to the caller.
 */
import { db, auditLogTable } from "@workspace/db";
import { logger } from "./logger";

export async function logAudit({
  userId,
  companyId,
  action,
  entityType,
  entityId,
  details,
  severity = "info",
}: {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  severity?: "info" | "warn" | "critical";
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
  } catch (err) {
    if (severity === "critical") {
      logger.error({ err, action, entityType, entityId }, "[audit] critical log failure — re-throwing");
      throw err;
    }
    if (severity === "warn") {
      logger.warn({ err, action, entityType, entityId }, "[audit] failed to log action");
    } else {
      logger.debug({ action, entityType, entityId }, "[audit] failed to log action (info-level, swallowed)");
    }
  }
}

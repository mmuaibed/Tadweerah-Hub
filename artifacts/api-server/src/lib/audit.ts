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
 *
 * actor_role:
 *   The business role of the actor in the context of this action.
 *   Examples: "producer", "buyer", "seller", "transporter", "admin", "system".
 *
 * status_before / status_after:
 *   Entity status before and after the action. Pass both for any action that
 *   causes a state transition. Pass null for creations (no prior state) or
 *   for actions that do not change entity status (e.g. extensions, updates).
 */
import { db, auditLogTable } from "@workspace/db";
import { logger } from "./logger";

export async function logAudit({
  userId,
  companyId,
  action,
  entityType,
  entityId,
  actorRole,
  statusBefore,
  statusAfter,
  details,
  severity = "info",
}: {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  /** Business role of the actor: "producer" | "buyer" | "seller" | "transporter" | "admin" | "system" */
  actorRole?: string | null;
  /** Entity status before this action (null for creations or non-status actions) */
  statusBefore?: string | null;
  /** Entity status after this action (null for non-status actions) */
  statusAfter?: string | null;
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
      actor_role: actorRole ?? null,
      status_before: statusBefore ?? null,
      status_after: statusAfter ?? null,
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

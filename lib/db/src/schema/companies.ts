import { pgTable, text, timestamp, uuid, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companyCategoriesTable } from "./company-categories";

export const companyTypeEnum = pgEnum("company_type", [
  "producer",
  "buyer",
  "carrier",
]);

/**
 * License approval lifecycle.
 * null     — no license submitted (legacy / no-license mode; treated as allowed)
 * pending  — license submitted, awaiting admin review
 * approved — admin approved; company may create listings and submit offers
 * rejected — admin rejected the submission
 * expired  — license was valid but has since expired
 */
export const licenseStatusEnum = pgEnum("license_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const companiesTable = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull().unique(),
  name: text("name").notNull(),
  type: companyTypeEnum("type"),
  city: text("city").notNull(),
  commercialRegistration: text("commercial_registration"),
  contactPhone: text("contact_phone").notNull(),

  /** Descriptive business category (admin-managed lookup). Separate from platform role. */
  company_category_id: uuid("company_category_id").references(
    () => companyCategoriesTable.id,
    { onDelete: "set null" },
  ),

  /** Regulatory license number (e.g. MOMRA, NCBE). Primary / first license. */
  license_number: text("license_number"),

  /**
   * JSON array of all submitted licenses.
   * Each entry: { number, issuer, expiryDate?, activityKeys }
   * The first entry mirrors license_number for backward compatibility.
   */
  licenses_json: text("licenses_json"),

  /** URL to uploaded license document image / PDF. */
  license_document_url: text("license_document_url"),

  /**
   * Admin-controlled status. Null = no license submitted (participates freely).
   * Once submitted → pending → admin sets approved / rejected / expired.
   */
  license_status: licenseStatusEnum("license_status"),

  /** Timestamp when the company owner accepted the Terms & Conditions. */
  accepted_terms_at: timestamp("accepted_terms_at", { withTimezone: true }),

  /**
   * Counts deals that expired while in 'dispatched' status where this company was the buyer.
   * Incremented automatically by the expiry job. Reset by admin via unblock-offers route.
   */
  receipt_failures_count: integer("receipt_failures_count").notNull().default(0),

  /**
   * When true, this company is blocked from submitting new offers.
   * Set automatically when receipt_failures_count reaches 2.
   * Cleared manually by admin via PATCH /admin/companies/:id/unblock-offers.
   */
  offer_submission_blocked: boolean("offer_submission_blocked").notNull().default(false),

  /** Optional override for email notification routing instead of defaulting to the owner. */
  notification_recipient_user_id: text("notification_recipient_user_id"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
  license_status: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

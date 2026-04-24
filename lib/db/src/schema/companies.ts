import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
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
  type: companyTypeEnum("type").notNull(),
  city: text("city").notNull(),
  commercialRegistration: text("commercial_registration"),
  contactPhone: text("contact_phone").notNull(),

  /** Descriptive business category (admin-managed lookup). Separate from platform role. */
  company_category_id: uuid("company_category_id").references(
    () => companyCategoriesTable.id,
    { onDelete: "set null" },
  ),

  /** Regulatory license number (e.g. MOMRA, NCBE). */
  license_number: text("license_number"),

  /** URL to uploaded license document image / PDF. */
  license_document_url: text("license_document_url"),

  /**
   * Admin-controlled status. Null = no license submitted (participates freely).
   * Once submitted → pending → admin sets approved / rejected / expired.
   */
  license_status: licenseStatusEnum("license_status"),

  /** Timestamp when the company owner accepted the Terms & Conditions. */
  accepted_terms_at: timestamp("accepted_terms_at", { withTimezone: true }),

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

import { pgEnum } from "drizzle-orm/pg-core";

/**
 * MWAN-aligned role enum for the company_roles junction table.
 * Maps directly to MWAN eManifest party classifications:
 *   generator  — produces / holds industrial or commercial waste
 *   receiver   — accepts waste for recycling or treatment
 *   transporter — licensed to move waste between facilities
 *
 * Kept separate from the legacy `companyTypeEnum` (producer/buyer/carrier)
 * which lives on companies.type for backward compatibility.
 */
export const mwanRoleEnum = pgEnum("mwan_role", [
  "generator",
  "receiver",
  "transporter",
]);

export type MwanRole = (typeof mwanRoleEnum.enumValues)[number];

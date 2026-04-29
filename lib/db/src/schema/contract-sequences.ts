import { pgTable, integer } from "drizzle-orm/pg-core";

/**
 * Atomic per-year counter for generating contract reference numbers.
 * TDW-CTR-{year}-{next_val - 1 (zero-padded to 4 digits)}
 *
 * Upserted with ON CONFLICT DO UPDATE SET next_val = next_val + 1
 * to guarantee atomic sequence assignment with no race conditions.
 */
export const contractSequencesTable = pgTable("contract_sequences", {
  year: integer("year").primaryKey(),
  next_val: integer("next_val").notNull().default(1),
});

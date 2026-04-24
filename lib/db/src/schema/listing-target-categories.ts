import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { wasteListingsTable } from "./waste-listings";
import { companyCategoriesTable } from "./company-categories";

/**
 * When a Direct Sale listing has targeting_type = 'category', this table
 * lists which company categories are allowed to see and bid on the listing.
 * Matching is done by company_category_id FK — never by label.
 */
export const listingTargetCategoriesTable = pgTable(
  "listing_target_categories",
  {
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => wasteListingsTable.id, { onDelete: "cascade" }),
    company_category_id: uuid("company_category_id")
      .notNull()
      .references(() => companyCategoriesTable.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("listing_target_category_unique").on(
      t.listing_id,
      t.company_category_id,
    ),
  ],
);

export type ListingTargetCategory =
  typeof listingTargetCategoriesTable.$inferSelect;

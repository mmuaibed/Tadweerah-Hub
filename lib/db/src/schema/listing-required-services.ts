import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { wasteListingsTable } from "./waste-listings";
import { capabilitiesTable } from "./capabilities";

/**
 * Listing-level required services / capabilities.
 * A producer sets these on the listing to indicate which capabilities a buying
 * company must have in order to submit an offer.
 *
 * If the linked capability has requires_license = true, the buyer must also have
 * license_status = 'approved'.
 *
 * Charter rule: matching is done via capabilitiesTable.key, never by display name.
 */
export const listingRequiredServicesTable = pgTable(
  "listing_required_services",
  {
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => wasteListingsTable.id, { onDelete: "cascade" }),
    capability_id: uuid("capability_id")
      .notNull()
      .references(() => capabilitiesTable.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("listing_required_service_unique").on(t.listing_id, t.capability_id),
  ],
);

export type ListingRequiredService = typeof listingRequiredServicesTable.$inferSelect;

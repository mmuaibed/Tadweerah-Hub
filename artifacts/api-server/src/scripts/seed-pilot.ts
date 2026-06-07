import { db, companiesTable, companyMembersTable, wasteListingsTable, listingOffersTable, materialCategoriesTable, unitOptionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

if (process.env.NODE_ENV === "production" && process.env.FORCE_PILOT_SEED !== "true") {
  console.error("❌ Refusing to run in production. Set FORCE_PILOT_SEED=true if you really mean it.");
  process.exit(1);
}

if (process.env.PILOT_SEED_CONFIRM !== "true") {
  console.error("❌ You must explicitly confirm by setting PILOT_SEED_CONFIRM=true");
  process.exit(1);
}

const isDryRun = process.env.PILOT_SEED_DRY_RUN === "true";

const SELLER_USER_ID = process.env.PILOT_SELLER_USER_ID;
const BUYER_USER_ID = process.env.PILOT_BUYER_USER_ID;
const TRANSPORTER_USER_ID = process.env.PILOT_TRANSPORTER_USER_ID;

if (!SELLER_USER_ID || !BUYER_USER_ID || !TRANSPORTER_USER_ID) {
  console.error("❌ Missing required Clerk User IDs.");
  console.error("Please provide PILOT_SELLER_USER_ID, PILOT_BUYER_USER_ID, and PILOT_TRANSPORTER_USER_ID in your environment.");
  console.error("This ensures demo companies are usable by real logged-in Clerk test accounts.");
  process.exit(1);
}

const PREFIX = "[PILOT DEMO]";

async function main() {
  console.log(`🌱 Starting Pilot Seed Script... ${isDryRun ? "[DRY RUN MODE]" : ""}`);
  console.log(`ℹ️ Real Clerk IDs Provided:\n  Seller: ${SELLER_USER_ID}\n  Buyer: ${BUYER_USER_ID}\n  Transporter: ${TRANSPORTER_USER_ID}\n`);

  // 1. Ensure Demo Seller Company
  let sellerCompany = await db.query.companiesTable.findFirst({
    where: eq(companiesTable.ownerUserId, SELLER_USER_ID!)
  });

  if (!sellerCompany) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would create Seller Company for ID: ${SELLER_USER_ID}`);
      sellerCompany = { id: "dry-run-seller-id", ownerUserId: SELLER_USER_ID!, name: `${PREFIX} Green Cycle Mfg` } as any;
    } else {
      const [inserted] = await db.insert(companiesTable).values({
        ownerUserId: SELLER_USER_ID!,
        name: `${PREFIX} Green Cycle Mfg`,
        type: "producer",
        city: "Riyadh",
        contactPhone: "0500000001",
        license_status: "approved",
        commercialRegistration: "1010101010",
        accepted_terms_at: new Date(),
      }).returning();
      sellerCompany = inserted;
      
      await db.insert(companyMembersTable).values({
        company_id: sellerCompany.id,
        user_id: SELLER_USER_ID!,
        role: "owner"
      }).onConflictDoNothing();
      console.log(`✅ Created Seller Company: ${sellerCompany.name}`);
    }
  } else {
    console.log(`ℹ️ Reused Seller Company: ${sellerCompany.name}`);
  }

  // 2. Ensure Demo Buyer Company
  let buyerCompany = await db.query.companiesTable.findFirst({
    where: eq(companiesTable.ownerUserId, BUYER_USER_ID!)
  });

  if (!buyerCompany) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would create Buyer Company for ID: ${BUYER_USER_ID}`);
      buyerCompany = { id: "dry-run-buyer-id", ownerUserId: BUYER_USER_ID!, name: `${PREFIX} Metal Recycling Co` } as any;
    } else {
      const [inserted] = await db.insert(companiesTable).values({
        ownerUserId: BUYER_USER_ID!,
        name: `${PREFIX} Metal Recycling Co`,
        type: "buyer",
        city: "Jeddah",
        contactPhone: "0500000002",
        license_status: "approved",
        commercialRegistration: "2020202020",
        accepted_terms_at: new Date(),
      }).returning();
      buyerCompany = inserted;

      await db.insert(companyMembersTable).values({
        company_id: buyerCompany.id,
        user_id: BUYER_USER_ID!,
        role: "owner"
      }).onConflictDoNothing();
      console.log(`✅ Created Buyer Company: ${buyerCompany.name}`);
    }
  } else {
    console.log(`ℹ️ Reused Buyer Company: ${buyerCompany.name}`);
  }

  // 3. Ensure Demo Transporter Company
  let transporterCompany = await db.query.companiesTable.findFirst({
    where: eq(companiesTable.ownerUserId, TRANSPORTER_USER_ID!)
  });

  if (!transporterCompany) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would create Transporter Company for ID: ${TRANSPORTER_USER_ID}`);
      transporterCompany = { id: "dry-run-transporter-id", ownerUserId: TRANSPORTER_USER_ID!, name: `${PREFIX} Fast Logistics` } as any;
    } else {
      const [inserted] = await db.insert(companiesTable).values({
        ownerUserId: TRANSPORTER_USER_ID!,
        name: `${PREFIX} Fast Logistics`,
        type: "carrier",
        city: "Dammam",
        contactPhone: "0500000003",
        license_status: "approved",
        commercialRegistration: "3030303030",
        accepted_terms_at: new Date(),
      }).returning();
      transporterCompany = inserted;

      await db.insert(companyMembersTable).values({
        company_id: transporterCompany.id,
        user_id: TRANSPORTER_USER_ID!,
        role: "owner"
      }).onConflictDoNothing();
      console.log(`✅ Created Transporter Company: ${transporterCompany.name}`);
    }
  } else {
    console.log(`ℹ️ Reused Transporter Company: ${transporterCompany.name}`);
  }

  // 4. Create an active listing
  let listing = await db.query.wasteListingsTable.findFirst({
    where: sql`${wasteListingsTable.company_id} = ${sellerCompany.id} AND ${wasteListingsTable.description} LIKE '%PILOT DEMO%'`
  });

  if (!listing) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would create Pilot Listing for Seller Company: ${sellerCompany.name}`);
      listing = { id: "dry-run-listing-id" } as any;
    } else {
      const tonUnit = await db.query.unitOptionsTable.findFirst({ where: eq(unitOptionsTable.key, "ton") });
      const metalMat = await db.query.materialCategoriesTable.findFirst({ where: eq(materialCategoriesTable.key, "metal") });

      const [insertedListing] = await db.insert(wasteListingsTable).values({
        company_id: sellerCompany.id,
        material: "metal",
        quantity: "50.000",
        unit: "ton",
        unit_option_id: tonUnit?.id,
        material_category_id: metalMat?.id,
        city: "Riyadh",
        description: `${PREFIX} High quality aluminum scrap ready for pickup.`,
        price_hint: "1500.00",
        status: "open",
        pricing_model: "fixed",
        visibility: "public",
        sale_type: "auction",
        targeting_type: "open",
        eligible_company_type: "ALL",
        transport_responsibility: "buyer",
        vat_applicable: true,
        material_location_address: "Industrial Area 2, Riyadh",
        material_location_notes: "Gate 4, ask for Ahmed"
      }).returning();
      listing = insertedListing;
      console.log(`✅ Created Pilot Listing: ID ${listing.id}`);
    }
  } else {
    console.log(`ℹ️ Reused Pilot Listing: ID ${listing.id}`);
  }

  // 5. Create an offer
  let offer = await db.query.listingOffersTable.findFirst({
    where: sql`${listingOffersTable.waste_listing_id} = ${listing.id} AND ${listingOffersTable.buyer_company_id} = ${buyerCompany.id}`
  });

  if (!offer) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would create Pilot Offer for Buyer Company: ${buyerCompany.name} on Listing ID: ${listing.id}`);
      offer = { id: "dry-run-offer-id" } as any;
    } else {
      const [insertedOffer] = await db.insert(listingOffersTable).values({
        waste_listing_id: listing.id,
        buyer_company_id: buyerCompany.id,
        price_per_unit: "1450.000",
        offer_subtotal_amount: "72500.00",
        message: `${PREFIX} We can pick this up tomorrow morning.`,
        status: "pending"
      }).returning();
      offer = insertedOffer;
      console.log(`✅ Created Pilot Offer: ID ${offer.id}`);
    }
  } else {
    console.log(`ℹ️ Reused Pilot Offer: ID ${offer.id}`);
  }

  console.log(`\n🎉 Pilot Seed Complete. ${isDryRun ? "(Nothing was saved to the database)" : ""}`);
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Fatal error during pilot seed:", err);
  process.exit(1);
});

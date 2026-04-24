/**
 * Seed script — populates admin-managed lookup tables.
 * Run with: pnpm --filter @workspace/db run seed
 * Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING pattern.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  companyCategoriesTable,
  unitOptionsTable,
  materialCategoriesTable,
} from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log("Seeding company categories...");
  await db
    .insert(companyCategoriesTable)
    .values([
      { name_ar: "مصنع", name_en: "Manufacturer", sort_order: 1 },
      { name_ar: "شركة تدوير", name_en: "Recycling Company", sort_order: 2 },
      { name_ar: "تاجر خردة", name_en: "Scrap Trader", sort_order: 3 },
      { name_ar: "مستشفى أو مرفق صحي", name_en: "Hospital / Medical Facility", sort_order: 4 },
      { name_ar: "مقاول أو إنشاءات", name_en: "Contractor / Construction", sort_order: 5 },
      { name_ar: "تجزئة أو توزيع", name_en: "Retail / Distribution", sort_order: 6 },
      { name_ar: "خدمات حكومية", name_en: "Government Services", sort_order: 7 },
      { name_ar: "شركة نقل وخدمات لوجستية", name_en: "Logistics & Transport", sort_order: 8 },
      { name_ar: "أخرى", name_en: "Other", sort_order: 9 },
    ])
    .onConflictDoNothing();

  console.log("Seeding unit options...");
  await db
    .insert(unitOptionsTable)
    .values([
      { name_ar: "كيلوجرام", name_en: "Kilogram", symbol: "kg", sort_order: 1 },
      { name_ar: "طن", name_en: "Ton", symbol: "ton", sort_order: 2 },
      { name_ar: "جرام", name_en: "Gram", symbol: "g", sort_order: 3 },
      { name_ar: "لتر", name_en: "Litre", symbol: "L", sort_order: 4 },
      { name_ar: "متر مكعب", name_en: "Cubic Metre", symbol: "m³", sort_order: 5 },
      { name_ar: "قطعة", name_en: "Piece", symbol: "pc", sort_order: 6 },
      { name_ar: "صندوق", name_en: "Box", symbol: "box", sort_order: 7 },
      { name_ar: "برميل", name_en: "Barrel", symbol: "bbl", sort_order: 8 },
      { name_ar: "أخرى", name_en: "Other", symbol: "—", sort_order: 9 },
    ])
    .onConflictDoNothing();

  console.log("Seeding material categories...");
  // Top-level categories
  const [paper] = await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "ورق وكرتون", name_en: "Paper & Cardboard", sort_order: 1 })
    .onConflictDoNothing()
    .returning();

  const [plastic] = await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "بلاستيك", name_en: "Plastic", sort_order: 2 })
    .onConflictDoNothing()
    .returning();

  const [metal] = await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "معادن", name_en: "Metals", sort_order: 3 })
    .onConflictDoNothing()
    .returning();

  const [glass] = await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "زجاج", name_en: "Glass", sort_order: 4 })
    .onConflictDoNothing()
    .returning();

  const [electronics] = await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "إلكترونيات", name_en: "Electronics & E-Waste", sort_order: 5 })
    .onConflictDoNothing()
    .returning();

  const [organic] = await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "نفايات عضوية", name_en: "Organic Waste", sort_order: 6 })
    .onConflictDoNothing()
    .returning();

  await db
    .insert(materialCategoriesTable)
    .values({ name_ar: "أخرى", name_en: "Other", sort_order: 7 })
    .onConflictDoNothing();

  // Subcategories (only if parent inserted above)
  if (paper) {
    await db
      .insert(materialCategoriesTable)
      .values([
        { name_ar: "ورق مكتبي", name_en: "Office Paper", parent_id: paper.id, sort_order: 1 },
        { name_ar: "كرتون مضلع", name_en: "Corrugated Cardboard", parent_id: paper.id, sort_order: 2 },
        { name_ar: "مجلات وجرائد", name_en: "Magazines & Newspapers", parent_id: paper.id, sort_order: 3 },
      ])
      .onConflictDoNothing();
  }

  if (plastic) {
    await db
      .insert(materialCategoriesTable)
      .values([
        { name_ar: "PET (عبوات مشروبات)", name_en: "PET (Beverage Bottles)", parent_id: plastic.id, sort_order: 1 },
        { name_ar: "HDPE (عبوات صناعية)", name_en: "HDPE (Industrial Containers)", parent_id: plastic.id, sort_order: 2 },
        { name_ar: "PP (بولي بروبيلين)", name_en: "PP (Polypropylene)", parent_id: plastic.id, sort_order: 3 },
        { name_ar: "أكياس بلاستيك", name_en: "Plastic Film & Bags", parent_id: plastic.id, sort_order: 4 },
      ])
      .onConflictDoNothing();
  }

  if (metal) {
    await db
      .insert(materialCategoriesTable)
      .values([
        { name_ar: "ألمنيوم", name_en: "Aluminum", parent_id: metal.id, sort_order: 1 },
        { name_ar: "نحاس", name_en: "Copper", parent_id: metal.id, sort_order: 2 },
        { name_ar: "حديد وصلب", name_en: "Iron & Steel", parent_id: metal.id, sort_order: 3 },
        { name_ar: "خردة مختلطة", name_en: "Mixed Scrap", parent_id: metal.id, sort_order: 4 },
      ])
      .onConflictDoNothing();
  }

  if (glass) {
    await db
      .insert(materialCategoriesTable)
      .values([
        { name_ar: "زجاج شفاف", name_en: "Clear Glass", parent_id: glass.id, sort_order: 1 },
        { name_ar: "زجاج ملون", name_en: "Coloured Glass", parent_id: glass.id, sort_order: 2 },
      ])
      .onConflictDoNothing();
  }

  if (electronics) {
    await db
      .insert(materialCategoriesTable)
      .values([
        { name_ar: "حواسيب وأجهزة", name_en: "Computers & Devices", parent_id: electronics.id, sort_order: 1 },
        { name_ar: "هواتف محمولة", name_en: "Mobile Phones", parent_id: electronics.id, sort_order: 2 },
        { name_ar: "كابلات وأسلاك", name_en: "Cables & Wires", parent_id: electronics.id, sort_order: 3 },
        { name_ar: "بطاريات", name_en: "Batteries", parent_id: electronics.id, sort_order: 4 },
      ])
      .onConflictDoNothing();
  }

  if (organic) {
    await db
      .insert(materialCategoriesTable)
      .values([
        { name_ar: "مخلفات مطاعم", name_en: "Food Waste (Restaurants)", parent_id: organic.id, sort_order: 1 },
        { name_ar: "نفايات زراعية", name_en: "Agricultural Waste", parent_id: organic.id, sort_order: 2 },
      ])
      .onConflictDoNothing();
  }

  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});

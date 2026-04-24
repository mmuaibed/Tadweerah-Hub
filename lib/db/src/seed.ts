/**
 * Seed script — populates admin-managed lookup tables.
 * Run with: pnpm --filter @workspace/db run seed
 * Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING pattern.
 *
 * RULES (charter §Lookup Tables):
 * - `key` is the stable internal identifier used in logic, eligibility, and filtering.
 * - `name_ar` / `name_en` are display labels only and may be changed freely.
 * - Never hardcode display labels in business logic — always use `key`.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  companyCategoriesTable,
  unitOptionsTable,
  materialCategoriesTable,
  capabilitiesTable,
} from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Fixed UUIDs for top-level material categories so subcategory parent_id refs
// are deterministic across environments and seed re-runs.
const MATERIAL_IDS = {
  paper:       "11111111-0001-0000-0000-000000000001",
  plastic:     "11111111-0002-0000-0000-000000000002",
  metal:       "11111111-0003-0000-0000-000000000003",
  glass:       "11111111-0004-0000-0000-000000000004",
  electronics: "11111111-0005-0000-0000-000000000005",
  organic:     "11111111-0006-0000-0000-000000000006",
  other:       "11111111-0007-0000-0000-000000000007",
};

async function main() {
  console.log("Seeding company categories...");
  await db
    .insert(companyCategoriesTable)
    .values([
      { key: "industrial_manufacturer", name_ar: "مصنع",                              name_en: "Manufacturer",                sort_order: 1 },
      { key: "recycler",                name_ar: "شركة تدوير",                          name_en: "Recycling Company",           sort_order: 2 },
      { key: "scrap_trader",            name_ar: "تاجر خردة",                          name_en: "Scrap Trader",                sort_order: 3 },
      { key: "medical",                 name_ar: "مستشفى أو مرفق صحي",                name_en: "Hospital / Medical Facility",  sort_order: 4 },
      { key: "construction",            name_ar: "مقاول أو إنشاءات",                  name_en: "Contractor / Construction",   sort_order: 5 },
      { key: "retail",                  name_ar: "تجزئة أو توزيع",                    name_en: "Retail / Distribution",       sort_order: 6 },
      { key: "government",              name_ar: "خدمات حكومية",                      name_en: "Government Services",         sort_order: 7 },
      { key: "logistics",               name_ar: "شركة نقل وخدمات لوجستية",          name_en: "Logistics & Transport",       sort_order: 8 },
      { key: "other",                   name_ar: "أخرى",                              name_en: "Other",                       sort_order: 9 },
    ])
    .onConflictDoNothing();

  console.log("Seeding unit options...");
  await db
    .insert(unitOptionsTable)
    .values([
      { key: "kg",           name_ar: "كيلوجرام",   name_en: "Kilogram",     symbol: "kg",  sort_order: 1 },
      { key: "ton",          name_ar: "طن",          name_en: "Ton",          symbol: "ton", sort_order: 2 },
      { key: "gram",         name_ar: "جرام",        name_en: "Gram",         symbol: "g",   sort_order: 3 },
      { key: "liter",        name_ar: "لتر",         name_en: "Litre",        symbol: "L",   sort_order: 4 },
      { key: "cubic_meter",  name_ar: "متر مكعب",    name_en: "Cubic Metre",  symbol: "m³",  sort_order: 5 },
      { key: "piece",        name_ar: "قطعة",        name_en: "Piece",        symbol: "pc",  sort_order: 6 },
      { key: "box",          name_ar: "صندوق",       name_en: "Box",          symbol: "box", sort_order: 7 },
      { key: "barrel",       name_ar: "برميل",       name_en: "Barrel",       symbol: "bbl", sort_order: 8 },
      { key: "other",        name_ar: "أخرى",        name_en: "Other",        symbol: "—",   sort_order: 9 },
    ])
    .onConflictDoNothing();

  console.log("Seeding material categories (top-level)...");
  await db
    .insert(materialCategoriesTable)
    .values([
      { id: MATERIAL_IDS.paper,       key: "paper",       name_ar: "ورق وكرتون",    name_en: "Paper & Cardboard",   sort_order: 1 },
      { id: MATERIAL_IDS.plastic,     key: "plastic",     name_ar: "بلاستيك",       name_en: "Plastic",             sort_order: 2 },
      { id: MATERIAL_IDS.metal,       key: "metal",       name_ar: "معادن",         name_en: "Metals",              sort_order: 3 },
      { id: MATERIAL_IDS.glass,       key: "glass",       name_ar: "زجاج",          name_en: "Glass",               sort_order: 4 },
      { id: MATERIAL_IDS.electronics, key: "electronics", name_ar: "إلكترونيات",    name_en: "Electronics & E-Waste", sort_order: 5 },
      { id: MATERIAL_IDS.organic,     key: "organic",     name_ar: "نفايات عضوية",  name_en: "Organic Waste",       sort_order: 6 },
      { id: MATERIAL_IDS.other,       key: "other",       name_ar: "أخرى",          name_en: "Other",               sort_order: 7 },
    ])
    .onConflictDoNothing();

  console.log("Seeding material categories (subcategories)...");
  await db
    .insert(materialCategoriesTable)
    .values([
      // Paper
      { key: "paper_office",       name_ar: "ورق مكتبي",              name_en: "Office Paper",               parent_id: MATERIAL_IDS.paper,       sort_order: 1 },
      { key: "paper_corrugated",   name_ar: "كرتون مضلع",              name_en: "Corrugated Cardboard",       parent_id: MATERIAL_IDS.paper,       sort_order: 2 },
      { key: "paper_magazines",    name_ar: "مجلات وجرائد",            name_en: "Magazines & Newspapers",     parent_id: MATERIAL_IDS.paper,       sort_order: 3 },
      // Plastic
      { key: "plastic_pet",        name_ar: "PET (عبوات مشروبات)",    name_en: "PET (Beverage Bottles)",     parent_id: MATERIAL_IDS.plastic,     sort_order: 1 },
      { key: "plastic_hdpe",       name_ar: "HDPE (عبوات صناعية)",    name_en: "HDPE (Industrial Containers)", parent_id: MATERIAL_IDS.plastic,   sort_order: 2 },
      { key: "plastic_pp",         name_ar: "PP (بولي بروبيلين)",     name_en: "PP (Polypropylene)",         parent_id: MATERIAL_IDS.plastic,     sort_order: 3 },
      { key: "plastic_film",       name_ar: "أكياس بلاستيك",          name_en: "Plastic Film & Bags",        parent_id: MATERIAL_IDS.plastic,     sort_order: 4 },
      // Metals
      { key: "metal_aluminum",     name_ar: "ألمنيوم",                name_en: "Aluminum",                   parent_id: MATERIAL_IDS.metal,       sort_order: 1 },
      { key: "metal_copper",       name_ar: "نحاس",                   name_en: "Copper",                     parent_id: MATERIAL_IDS.metal,       sort_order: 2 },
      { key: "metal_iron_steel",   name_ar: "حديد وصلب",              name_en: "Iron & Steel",               parent_id: MATERIAL_IDS.metal,       sort_order: 3 },
      { key: "metal_mixed",        name_ar: "خردة مختلطة",            name_en: "Mixed Scrap",                parent_id: MATERIAL_IDS.metal,       sort_order: 4 },
      // Glass
      { key: "glass_clear",        name_ar: "زجاج شفاف",              name_en: "Clear Glass",                parent_id: MATERIAL_IDS.glass,       sort_order: 1 },
      { key: "glass_coloured",     name_ar: "زجاج ملون",              name_en: "Coloured Glass",             parent_id: MATERIAL_IDS.glass,       sort_order: 2 },
      // Electronics
      { key: "electronics_computers", name_ar: "حواسيب وأجهزة",      name_en: "Computers & Devices",        parent_id: MATERIAL_IDS.electronics, sort_order: 1 },
      { key: "electronics_mobile",    name_ar: "هواتف محمولة",        name_en: "Mobile Phones",              parent_id: MATERIAL_IDS.electronics, sort_order: 2 },
      { key: "electronics_cables",    name_ar: "كابلات وأسلاك",       name_en: "Cables & Wires",             parent_id: MATERIAL_IDS.electronics, sort_order: 3 },
      { key: "electronics_batteries", name_ar: "بطاريات",             name_en: "Batteries",                  parent_id: MATERIAL_IDS.electronics, sort_order: 4 },
      // Organic
      { key: "organic_food",       name_ar: "مخلفات مطاعم",           name_en: "Food Waste (Restaurants)",   parent_id: MATERIAL_IDS.organic,     sort_order: 1 },
      { key: "organic_agricultural", name_ar: "نفايات زراعية",        name_en: "Agricultural Waste",         parent_id: MATERIAL_IDS.organic,     sort_order: 2 },
    ])
    .onConflictDoNothing();

  console.log("Seeding capabilities...");
  await db
    .insert(capabilitiesTable)
    .values([
      {
        key: "collect_waste",
        name_ar: "تجميع النفايات",
        name_en: "Waste Collection",
        description_ar: "القدرة على تجميع النفايات من موقع المنتج",
        description_en: "Ability to physically collect waste from producer sites",
        sort_order: 1,
      },
      {
        key: "transport_waste",
        name_ar: "نقل النفايات",
        name_en: "Waste Transport",
        description_ar: "امتلاك مركبات مرخصة لنقل النفايات",
        description_en: "Licensed vehicles for transporting waste materials",
        sort_order: 2,
      },
      {
        key: "recycle_paper",
        name_ar: "تدوير الورق",
        name_en: "Paper Recycling",
        description_ar: "معالجة وتدوير الورق والكرتون",
        description_en: "Processing and recycling of paper and cardboard",
        sort_order: 3,
      },
      {
        key: "recycle_plastic",
        name_ar: "تدوير البلاستيك",
        name_en: "Plastic Recycling",
        description_ar: "معالجة وتدوير المواد البلاستيكية",
        description_en: "Processing and recycling of plastic materials",
        sort_order: 4,
      },
      {
        key: "recycle_metal",
        name_ar: "تدوير المعادن",
        name_en: "Metal Recycling",
        description_ar: "معالجة وتدوير الخردة والمعادن",
        description_en: "Processing and recycling of metal scrap and alloys",
        sort_order: 5,
      },
      {
        key: "recycle_glass",
        name_ar: "تدوير الزجاج",
        name_en: "Glass Recycling",
        description_ar: "معالجة وتدوير الزجاج",
        description_en: "Processing and recycling of glass materials",
        sort_order: 6,
      },
      {
        key: "recycle_electronics",
        name_ar: "تدوير الإلكترونيات",
        name_en: "E-Waste Recycling",
        description_ar: "معالجة وتدوير المخلفات الإلكترونية",
        description_en: "Safe handling and recycling of electronic waste",
        sort_order: 7,
      },
      {
        key: "process_organic",
        name_ar: "معالجة النفايات العضوية",
        name_en: "Organic Waste Processing",
        description_ar: "تحويل النفايات العضوية إلى سماد أو طاقة",
        description_en: "Composting or energy recovery from organic waste",
        sort_order: 8,
      },
      {
        key: "licensed_waste_management",
        name_ar: "ترخيص إدارة النفايات",
        name_en: "Licensed Waste Management",
        description_ar: "حاصل على ترخيص رسمي لإدارة النفايات",
        description_en: "Holds an official waste management license",
        sort_order: 9,
      },
      {
        key: "has_weigh_bridge",
        name_ar: "موازين شهادة",
        name_en: "Certified Weighing Equipment",
        description_ar: "امتلاك جسر وزن أو موازين معتمدة",
        description_en: "Certified weigh bridge or scales for accurate weight measurement",
        sort_order: 10,
      },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});

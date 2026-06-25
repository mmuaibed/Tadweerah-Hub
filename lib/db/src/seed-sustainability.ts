/**
 * Seed script — sustainability pathways + protected report field config.
 * Run with: pnpm --filter @workspace/db run seed:sustainability
 * Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING pattern.
 *
 * DESIGN DECISIONS (v1.1):
 * - 10 GRI 306-aligned pathways seeded
 * - "other" pathway has is_circular_diversion = false (non-circular by default)
 * - Only reuse, repair/refurbishment, remanufacturing, recycling, material_recovery are circular
 * - 13 protected system fields seeded with is_system_field = true
 * - Data Quality naming (not Confidence Level)
 * - CO₂e wording: "Not estimated — pending methodology governance" /
 *   «غير مُقدَّر — بانتظار اعتماد المنهجية»
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  sustainabilityPathwaysTable,
  sustainabilityReportFieldConfigTable,
} from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  // ── 1. Seed sustainability pathways ─────────────────────────────────────
  console.log("Seeding sustainability pathways (10 GRI 306-aligned)...");
  await db
    .insert(sustainabilityPathwaysTable)
    .values([
      {
        key: "reuse",
        name_ar: "إعادة الاستخدام",
        name_en: "Reuse",
        category: "circular",
        is_circular_diversion: true,
        requires_explanation: false,
        sort_order: 1,
      },
      {
        key: "repair_refurbishment",
        name_ar: "الإصلاح / التجديد",
        name_en: "Repair / Refurbishment",
        category: "circular",
        is_circular_diversion: true,
        requires_explanation: false,
        sort_order: 2,
      },
      {
        key: "remanufacturing",
        name_ar: "إعادة التصنيع",
        name_en: "Remanufacturing",
        category: "circular",
        is_circular_diversion: true,
        requires_explanation: false,
        sort_order: 3,
      },
      {
        key: "recycling",
        name_ar: "إعادة التدوير",
        name_en: "Recycling",
        category: "circular",
        is_circular_diversion: true,
        requires_explanation: false,
        sort_order: 4,
      },
      {
        key: "material_recovery",
        name_ar: "استرداد المواد",
        name_en: "Material Recovery",
        category: "circular",
        is_circular_diversion: true,
        requires_explanation: false,
        sort_order: 5,
      },
      {
        key: "energy_recovery",
        name_ar: "استرداد الطاقة / وقود بديل",
        name_en: "Energy Recovery / Alternative Fuel",
        category: "energy",
        is_circular_diversion: false, // diverted from landfill but NOT circular
        requires_explanation: false,
        sort_order: 6,
      },
      {
        key: "safe_treatment",
        name_ar: "المعالجة الآمنة",
        name_en: "Safe Treatment",
        category: "treatment",
        is_circular_diversion: false,
        requires_explanation: false,
        sort_order: 7,
      },
      {
        key: "certified_disposal",
        name_ar: "التخلص المعتمد",
        name_en: "Certified Disposal",
        category: "disposal",
        is_circular_diversion: false,
        requires_explanation: false,
        sort_order: 8,
      },
      {
        key: "residue_loss",
        name_ar: "فاقد ومخلفات ومرفوضات",
        name_en: "Residue / Loss / Rejected",
        category: "residue",
        is_circular_diversion: false,
        requires_explanation: false,
        sort_order: 9,
      },
      {
        key: "other",
        name_ar: "أخرى",
        name_en: "Other",
        category: "other",
        is_circular_diversion: false, // explicitly NON-circular by default
        requires_explanation: true,   // processor must explain
        sort_order: 10,
      },
    ])
    .onConflictDoNothing();

  // ── 2. Seed protected report field config ───────────────────────────────
  console.log("Seeding sustainability report field config (13 protected system fields)...");
  await db
    .insert(sustainabilityReportFieldConfigTable)
    .values([
      {
        field_key: "disclaimer",
        label_ar: "إخلاء المسؤولية",
        label_en: "Disclaimer",
        is_visible: true,
        is_system_field: true,
        sort_order: 1,
        section: "disclaimer",
        description: "Standard report disclaimer — cannot be hidden or removed",
      },
      {
        field_key: "cross_transaction_scope",
        label_ar: "نطاق التقرير وسياسة منع الازدواجية",
        label_en: "Report Scope & Double-Counting Policy",
        is_visible: true,
        is_system_field: true,
        sort_order: 2,
        section: "disclaimer",
        description: "Cross-transaction scope statement — cannot be hidden",
      },
      {
        field_key: "provenance_legend",
        label_ar: "مصادر البيانات ومستوى التحقق",
        label_en: "Data Provenance Legend",
        is_visible: true,
        is_system_field: true,
        sort_order: 3,
        section: "footer",
        description: "Data provenance legend showing data source indicators",
      },
      {
        field_key: "declared_by_processor_label",
        label_ar: "مُصرَّح به من المعالج",
        label_en: "Declared by Processor",
        is_visible: true,
        is_system_field: true,
        sort_order: 4,
        section: "allocation",
        description: "Label indicating processor-declared pathway allocation",
      },
      {
        field_key: "not_verified_label",
        label_ar: "غير مُتحقَّق منه بشكل مستقل",
        label_en: "Not Independently Verified",
        is_visible: true,
        is_system_field: true,
        sort_order: 5,
        section: "allocation",
        description: "Label clarifying allocations are not independently verified",
      },
      {
        field_key: "data_quality",
        label_ar: "جودة البيانات",
        label_en: "Data Quality",
        is_visible: true,
        is_system_field: true,
        sort_order: 6,
        section: "metrics",
        description: "Data Quality badge/score (was Confidence Level — renamed per v1.1 C6)",
      },
      {
        field_key: "energy_recovery_rate",
        label_ar: "نسبة استرداد الطاقة",
        label_en: "Energy Recovery Rate",
        is_visible: true,
        is_system_field: true,
        sort_order: 7,
        section: "metrics",
        description: "System-calculated energy recovery percentage",
      },
      {
        field_key: "disposal_rate",
        label_ar: "نسبة التخلص",
        label_en: "Disposal Rate",
        is_visible: true,
        is_system_field: true,
        sort_order: 8,
        section: "metrics",
        description: "System-calculated disposal/treatment percentage",
      },
      {
        field_key: "residue_rate",
        label_ar: "نسبة الفاقد والمخلفات",
        label_en: "Residue / Loss Rate",
        is_visible: true,
        is_system_field: true,
        sort_order: 9,
        section: "metrics",
        description: "System-calculated residue/loss/rejected percentage",
      },
      {
        field_key: "estimated_label",
        label_ar: "غير مُقدَّر — بانتظار اعتماد المنهجية",
        label_en: "Not estimated — pending methodology governance",
        is_visible: true,
        is_system_field: true,
        sort_order: 10,
        section: "metrics",
        description: "Label for values not yet estimated — exact wording per v1.1 C7",
      },
      {
        field_key: "circular_diversion_rate",
        label_ar: "نسبة التحويل الدائري",
        label_en: "Circular Diversion Rate",
        is_visible: true,
        is_system_field: true,
        sort_order: 11,
        section: "metrics",
        description: "System-calculated circular diversion percentage",
      },
      {
        field_key: "methodology_footer",
        label_ar: "المنهجية المرجعية: GRI 306: النفايات (2020)",
        label_en: "Methodology reference: GRI 306: Waste (2020)",
        is_visible: true,
        is_system_field: true,
        sort_order: 12,
        section: "footer",
        description: "Methodology reference footer — cannot be hidden",
      },
      {
        field_key: "co2e_placeholder",
        label_ar: "غير مُقدَّر — بانتظار اعتماد المنهجية",
        label_en: "Not estimated — pending methodology governance",
        is_visible: true,
        is_system_field: true,
        sort_order: 13,
        section: "metrics",
        description: "CO₂e placeholder — exact wording per v1.1 C7. Must never render as blank/zero.",
      },
    ])
    .onConflictDoNothing();

  console.log("Sustainability seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});

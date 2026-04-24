#!/usr/bin/env node
/**
 * Charter Validation Test
 * =======================
 * Verifies two invariants:
 *
 * §1  Listing creation: any company can create a listing regardless of
 *     license_status (null / pending / approved / rejected / expired).
 *     → DB: direct INSERT succeeds for all 5 states.
 *     → Static: POST /listings handler contains no eligibility patterns.
 *
 * §2  Offer eligibility guards are present in POST /offers:
 *     (a) missing capability, (b) license-required service, (c) targeting, (d) self-bid.
 *     → Static: grep confirms all guard code is present.
 *
 * Run: node --import=tsx/esm scripts/validate-charter.mjs
 *   or: DATABASE_URL=... node scripts/validate-charter.mjs
 */

import { readFileSync } from "fs";
import { createRequire } from "module";

// Resolve pg from where it is installed — lib/db workspace has it as a direct dep
const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const { Client } = require("pg");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString: DB_URL });
await client.connect();

let passed = 0;
let failed = 0;
const cleanupCompanyIds = [];
const cleanupListingIds = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, detail = "") {
  console.error(`  ❌ ${label}${detail ? "\n     " + detail : ""}`);
  failed++;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

async function createCompany(licenseStatus) {
  const uid = `charter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await client.query(
    `INSERT INTO companies (owner_user_id, name, city, contact_phone, license_status)
     VALUES ($1, $2, 'Riyadh', '0500000001', $3::license_status)
     RETURNING id`,
    [uid, `Charter-${licenseStatus ?? "null"}`, licenseStatus ?? null],
  );
  const id = rows[0].id;
  cleanupCompanyIds.push(id);
  return id;
}

async function createListing(companyId) {
  const { rows } = await client.query(
    `INSERT INTO waste_listings (company_id, material, quantity, unit, city)
     VALUES ($1, 'paper', 100, 'kg', 'Riyadh')
     RETURNING id`,
    [companyId],
  );
  const id = rows[0].id;
  cleanupListingIds.push(id);
  return id;
}

async function cleanup() {
  if (cleanupListingIds.length) {
    await client.query(
      `DELETE FROM waste_listings WHERE id = ANY($1::uuid[])`,
      [cleanupListingIds],
    );
  }
  if (cleanupCompanyIds.length) {
    await client.query(
      `DELETE FROM companies WHERE id = ANY($1::uuid[])`,
      [cleanupCompanyIds],
    );
  }
}

/* ══════════════════════════════════════════════════════════════════════
   §1  Listing creation — DB confirms no gate for any license state
   ══════════════════════════════════════════════════════════════════════ */

console.log("\n§1  Listing creation — all license states can post listings\n");

for (const state of [null, "pending", "approved", "rejected", "expired"]) {
  try {
    const cid = await createCompany(state);
    await createListing(cid);
    ok(`license_status=${state ?? "null"} → listing created`);
  } catch (err) {
    fail(`license_status=${state ?? "null"} → listing BLOCKED`, err.message);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   §1b Static — POST /listings handler must contain no eligibility code
   ══════════════════════════════════════════════════════════════════════ */

console.log("\n§1b Static — POST /listings source contains no eligibility gates\n");

const listingsSrc = readFileSync(
  "artifacts/api-server/src/routes/listings.ts",
  "utf8",
);

// Extract only the POST /listings handler block (up to next router.*)
const handlerRe =
  /router\.post\(\s*["']\/listings["'][\s\S]*?(?=\nrouter\.(?:get|post|put|delete|patch)|export default)/;
const handlerBlock = handlerRe.exec(listingsSrc)?.[0] ?? "";

if (!handlerBlock) {
  fail("Could not extract POST /listings handler block for static analysis");
} else {
  const banned = [
    [/license_status\s*(===|!==)/, "license_status comparison"],
    [/LicenseInvalid/, "LicenseInvalid error code"],
    [/LicenseRequired/, "LicenseRequired error code"],
    [/MissingCapability/, "MissingCapability error code"],
    [/requires_license/, "requires_license access"],
    [/throw.*[Ll]icense/, "throw-with-license pattern"],
  ];
  for (const [re, label] of banned) {
    if (re.test(handlerBlock)) {
      fail(`POST /listings contains forbidden '${label}'`);
    } else {
      ok(`POST /listings — no '${label}'`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   §2  Offer eligibility guards are present in POST /offers
   ══════════════════════════════════════════════════════════════════════ */

console.log("\n§2  Offer eligibility — required guards present in POST /offers\n");

const offersSrc = readFileSync(
  "artifacts/api-server/src/routes/offers.ts",
  "utf8",
);

const required = [
  [/MissingCapability/, "MissingCapability (capability gate)"],
  [/LicenseRequired/, "LicenseRequired (license-gated service)"],
  [/TargetingRestricted/, "TargetingRestricted (targeting gate)"],
  [/listing\.company_id === company\.id|company_id.*===.*company\.id/, "Self-bid block"],
  [/already_top/, "already_top bidder detection"],
];

for (const [re, label] of required) {
  if (re.test(offersSrc)) {
    ok(`POST /offers has ${label}`);
  } else {
    fail(`POST /offers is MISSING ${label}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Cleanup + summary
   ══════════════════════════════════════════════════════════════════════ */

await cleanup();
await client.end();

console.log(`\n${"─".repeat(56)}`);
console.log(`  Total: ${passed + failed} checks — ${passed} passed, ${failed} failed`);
console.log("─".repeat(56));

if (failed > 0) {
  console.error("\n🚨 Charter validation FAILED\n");
  process.exit(1);
} else {
  console.log("\n✅ All charter checks passed\n");
}

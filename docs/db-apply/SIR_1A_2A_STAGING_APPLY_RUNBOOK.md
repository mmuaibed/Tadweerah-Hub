# SIR-1A.2a Staging Apply Runbook

This runbook outlines the secure, manual steps to apply the Phase SIR-1A.2a sustainability schema foundation to the **staging database**.

> [!WARNING]
> **STRICT SAFETY RULES**
> - NEVER paste database credentials, secrets, or connection strings into chat.
> - NEVER commit `.env` files or secrets to version control.
> - NEVER run `npx drizzle-kit push` against staging or production.
> - NEVER run any database mutation commands against the production DB during this step.
> - Apply ONLY the reviewed manual SQL file (`docs/db-apply/sustainability_schema_incremental_review.sql`).

## 1. Pre-Apply Checklist

Before proceeding, confirm all of the following:

- [ ] Target environment is strictly **STAGING**.
- [ ] A fresh Cloud SQL staging snapshot/backup has been created successfully.
- [ ] Rollback plan is understood (restore from the snapshot taken in the previous step).
- [ ] Target database is NOT the production database.

## 2. Secure Connection Options

Choose one of the following secure methods to connect to the staging database:

- **Option A:** GCP Console / Cloud SQL Studio / Query Editor (No local connection needed).
- **Option B:** Cloud SQL Auth Proxy combined with a local `psql` client.
- **Option C:** Local terminal session where `DATABASE_URL` is exported strictly in memory (e.g., `export DATABASE_URL="postgres://..."`), never committed or pasted elsewhere.

## 3. Preflight SQL Check

Before executing the full schema update, run the following queries to verify the environment and database compatibility:

```sql
SELECT current_database(), current_user;
SELECT gen_random_uuid();
```

> [!CAUTION]
> If `gen_random_uuid()` fails or returns an error, **STOP IMMEDIATELY** and report the error. Do not proceed to the schema apply.

## 4. Apply Schema Steps

If the preflight check succeeds, proceed with the manual schema apply:

1. Open `docs/db-apply/sustainability_schema_incremental_review.sql`.
2. Run the full contents of this script against the staging database.
3. Ensure no `DROP`, `DELETE`, or `TRUNCATE` commands are executed.
4. Capture any success/error output returned by the database.

## 5. Seed Steps

After the schema has been successfully applied, you must seed the initial pathway and field configuration data:

1. Ensure the `DATABASE_URL` for staging is securely set in your local terminal environment. (Do NOT expose the URL in logs or chat).
2. Run the repository's sustainability seed command:
   ```bash
   pnpm --filter @workspace/db run seed:sustainability
   ```
   *(Or the equivalent `npm run`/`yarn` command defined in `lib/db/package.json` if using a different package manager).*

## 6. Verification Queries

Run the following read-only SQL checks against staging to verify the apply was successful:

**Verify 6 new tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'sustainability_%';
```
*(Should return: `sustainability_pathways`, `sustainability_received_lines`, `sustainability_allocations`, `sustainability_allocation_lines`, `sustainability_report_field_config`, `sustainability_reports`)*

**Verify boolean flags on existing tables:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'waste_listings' AND column_name = 'is_processed_output';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contract_materials' AND column_name = 'is_processed_output';
```

**Verify Seed Data:**
```sql
-- Confirm 10 pathways
SELECT COUNT(*) FROM sustainability_pathways;

-- Confirm 13 protected system fields
SELECT COUNT(*) FROM sustainability_report_field_config WHERE is_system_field = true;

-- Confirm 'other' and 'energy' pathways are non-circular
SELECT key, is_circular_diversion 
FROM sustainability_pathways 
WHERE key IN ('other', 'energy');
-- (Should both return false)

-- Confirm co2e placeholder exists and is system-protected
SELECT field_key, is_system_field 
FROM sustainability_report_field_config 
WHERE field_key = 'co2e_placeholder';
```

## 7. Post-Apply Record

Record the execution of this runbook for auditing purposes. Do not proceed to SIR-1A.2b (Auto-Derivation Hooks) until the verification passes.

- **Apply Date/Time:** 2026-06-25
- **Applied By:** DB Owner / Admin
- **Target DB:** Staging Only (Confirmed)
- **Errors Encountered (if any):** None
- **Verification Result:** Passed

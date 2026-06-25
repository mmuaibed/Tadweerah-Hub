-- Phase SIR-1A.2a Manual Incremental Schema Review Script
-- Purpose: Adds the sustainability schema foundation and the 'is_processed_output' columns safely.
-- DO NOT RUN AUTOMATICALLY - REVIEW ONLY

BEGIN;

-- 1. Enum Types
DO $$ BEGIN
 CREATE TYPE "public"."sustainability_pathway_category" AS ENUM('circular', 'energy', 'treatment', 'disposal', 'residue', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."sust_received_line_parent_type" AS ENUM('deal', 'auction', 'contract', 'contract_shipment', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."sust_received_line_source_type" AS ENUM('listing', 'contract_material', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."sust_quantity_source" AS ENUM('platform_confirmed', 'estimated', 'manual_entry');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."sustainability_allocation_status" AS ENUM('draft', 'finalized', 'needs_review', 'superseded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."sust_data_quality_level" AS ENUM('high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 2. Add is_processed_output flag to existing operational tables
ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "is_processed_output" boolean;
ALTER TABLE "contract_materials" ADD COLUMN IF NOT EXISTS "is_processed_output" boolean;

-- 3. Create Sustainability Tables
CREATE TABLE IF NOT EXISTS "sustainability_pathways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"category" "public"."sustainability_pathway_category" NOT NULL,
	"is_circular_diversion" boolean NOT NULL,
	"requires_explanation" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sustainability_pathways_key_unique" UNIQUE("key")
);

CREATE TABLE IF NOT EXISTS "sustainability_received_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_entity_type" "public"."sust_received_line_parent_type" NOT NULL,
	"parent_entity_id" uuid NOT NULL,
	"line_seq" integer DEFAULT 1 NOT NULL,
	"source_line_type" "public"."sust_received_line_source_type" NOT NULL,
	"source_line_id" uuid,
	"seller_company_id" uuid NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"material_category_id" uuid,
	"material_label" text NOT NULL,
	"final_received_qty" numeric(12, 3) NOT NULL,
	"final_received_unit" text NOT NULL,
	"quantity_source" "public"."sust_quantity_source" NOT NULL,
	"location_label" text,
	"is_eligible" boolean DEFAULT true NOT NULL,
	"ineligibility_reason" text,
	"evidence_metadata" jsonb,
	"derived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"derived_by" text DEFAULT 'system:auto_derive' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sustainability_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"received_line_id" uuid NOT NULL,
	"status" "public"."sustainability_allocation_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"revision_reason" text,
	"allocation_tolerance_pct" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"allocation_variance_pct" numeric(5, 2),
	"data_quality_level" "public"."sust_data_quality_level",
	"data_quality_reason" text,
	"has_weighbridge_ticket" boolean DEFAULT false NOT NULL,
	"has_payment_proof" boolean DEFAULT false NOT NULL,
	"has_dispatch_evidence" boolean DEFAULT false NOT NULL,
	"has_receipt_confirmation" boolean DEFAULT false NOT NULL,
	"finalized_by" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sustainability_allocation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"pathway_id" uuid NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"explanation_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sustainability_report_field_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_key" text NOT NULL,
	"label_ar" text NOT NULL,
	"label_en" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_system_field" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"section" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sustainability_report_field_config_field_key_unique" UNIQUE("field_key")
);

CREATE TABLE IF NOT EXISTS "sustainability_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_number" text NOT NULL,
	"parent_entity_type" "public"."sust_received_line_parent_type" NOT NULL,
	"parent_entity_id" uuid NOT NULL,
	"allocation_id" uuid,
	"scope_type" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by_user_id" text,
	"methodology_version" text NOT NULL,
	"disclaimer_version" text NOT NULL,
	"report_data_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sustainability_reports_report_number_unique" UNIQUE("report_number")
);

-- 4. Foreign Keys
DO $$ BEGIN
 ALTER TABLE "sustainability_received_lines" ADD CONSTRAINT "sustainability_received_lines_seller_company_id_companies_id_fk" FOREIGN KEY ("seller_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "sustainability_received_lines" ADD CONSTRAINT "sustainability_received_lines_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "sustainability_received_lines" ADD CONSTRAINT "sustainability_received_lines_material_category_id_material_categories_id_fk" FOREIGN KEY ("material_category_id") REFERENCES "public"."material_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "sustainability_allocations" ADD CONSTRAINT "sustainability_allocations_received_line_id_sustainability_received_lines_id_fk" FOREIGN KEY ("received_line_id") REFERENCES "public"."sustainability_received_lines"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "sustainability_allocation_lines" ADD CONSTRAINT "sustainability_allocation_lines_allocation_id_sustainability_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."sustainability_allocations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "sustainability_allocation_lines" ADD CONSTRAINT "sustainability_allocation_lines_pathway_id_sustainability_pathways_id_fk" FOREIGN KEY ("pathway_id") REFERENCES "public"."sustainability_pathways"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "sustainability_reports" ADD CONSTRAINT "sustainability_reports_allocation_id_sustainability_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."sustainability_allocations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 5. Indexes and Unique Constraints
CREATE INDEX IF NOT EXISTS "idx_sust_pathways_category" ON "sustainability_pathways" ("category");
CREATE INDEX IF NOT EXISTS "idx_sust_pathways_active" ON "sustainability_pathways" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_sust_received_parent" ON "sustainability_received_lines" ("parent_entity_type","parent_entity_id");
CREATE INDEX IF NOT EXISTS "idx_sust_received_buyer_company" ON "sustainability_received_lines" ("buyer_company_id");
CREATE INDEX IF NOT EXISTS "idx_sust_received_seller_company" ON "sustainability_received_lines" ("seller_company_id");
CREATE INDEX IF NOT EXISTS "idx_sust_received_eligible" ON "sustainability_received_lines" ("is_eligible");
CREATE INDEX IF NOT EXISTS "idx_sust_received_material_cat" ON "sustainability_received_lines" ("material_category_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_sust_received_parent_line" ON "sustainability_received_lines" ("parent_entity_type","parent_entity_id","line_seq");

CREATE INDEX IF NOT EXISTS "idx_sust_alloc_received_line" ON "sustainability_allocations" ("received_line_id");
CREATE INDEX IF NOT EXISTS "idx_sust_alloc_status" ON "sustainability_allocations" ("status");
CREATE INDEX IF NOT EXISTS "idx_sust_alloc_lines_allocation" ON "sustainability_allocation_lines" ("allocation_id");
CREATE INDEX IF NOT EXISTS "idx_sust_alloc_lines_pathway" ON "sustainability_allocation_lines" ("pathway_id");

CREATE INDEX IF NOT EXISTS "idx_sust_field_config_system" ON "sustainability_report_field_config" ("is_system_field");
CREATE INDEX IF NOT EXISTS "idx_sust_field_config_section" ON "sustainability_report_field_config" ("section");

CREATE INDEX IF NOT EXISTS "idx_sust_reports_allocation" ON "sustainability_reports" ("allocation_id");
CREATE INDEX IF NOT EXISTS "idx_sust_reports_scope_type" ON "sustainability_reports" ("scope_type");

COMMIT;

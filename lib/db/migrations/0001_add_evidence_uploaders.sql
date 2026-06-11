ALTER TABLE "contract_shipments" ADD COLUMN IF NOT EXISTS "source_ticket_uploaded_by_company_id" uuid;
ALTER TABLE "contract_shipments" ADD COLUMN IF NOT EXISTS "destination_ticket_uploaded_by_company_id" uuid;

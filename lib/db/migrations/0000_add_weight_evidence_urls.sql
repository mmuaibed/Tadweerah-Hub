ALTER TABLE "contract_shipments" ADD COLUMN IF NOT EXISTS "source_ticket_url" text;
ALTER TABLE "contract_shipments" ADD COLUMN IF NOT EXISTS "destination_ticket_url" text;

import { sql, eq } from "drizzle-orm";
import { db, contractSequencesTable, contractShipmentsTable } from "@workspace/db";

/**
 * Atomically allocates the next contract reference number for the current year.
 * Uses ON CONFLICT DO UPDATE to ensure no two contracts ever share the same sequence.
 *
 * Returns: TDW-CTR-{year}-{seq} where seq is zero-padded to 4 digits.
 */
export async function nextContractReference(): Promise<string> {
  const year = new Date().getFullYear();

  const [row] = await db
    .insert(contractSequencesTable)
    .values({ year, next_val: 2 })
    .onConflictDoUpdate({
      target: contractSequencesTable.year,
      set: { next_val: sql`${contractSequencesTable.next_val} + 1` },
    })
    .returning();

  const assigned = row.next_val - 1;
  return `TDW-CTR-${year}-${String(assigned).padStart(4, "0")}`;
}

/**
 * Allocates the next shipment reference number for a given contract.
 * Must be called inside a transaction to prevent duplicate references
 * under concurrent shipment creation.
 *
 * Returns: {contractRef}-S{seq} where seq is zero-padded to 3 digits.
 */
export async function nextShipmentReference(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  contractId: string,
  contractRef: string,
): Promise<string> {
  const [countRow] = await tx
    .select({ count: sql<string>`count(*)::text` })
    .from(contractShipmentsTable)
    .where(eq(contractShipmentsTable.contract_id, contractId))
    .for("update");

  const seq = Number(countRow.count) + 1;
  return `${contractRef}-S${String(seq).padStart(3, "0")}`;
}

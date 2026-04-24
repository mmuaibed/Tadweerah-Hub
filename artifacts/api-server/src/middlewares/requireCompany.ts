import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, type Company } from "@workspace/db";
import type { AuthedRequest } from "./requireAuth";

export interface AuthedCompanyRequest extends AuthedRequest {
  company: Company;
}

/**
 * Loads the company owned by the authenticated user.
 * Must be used AFTER requireAuth.
 *
 * The optional `_allowedTypes` parameter is accepted for backward compatibility
 * but is no longer enforced — the platform uses capability/ownership checks
 * instead of company-type role gates.
 */
export function requireCompany(
  _allowedTypes?: ReadonlyArray<string>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId } = req as AuthedRequest;

    const rows = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.ownerUserId, userId))
      .limit(1);

    const company = rows[0];
    if (!company) {
      res.status(403).json({ error: "Company profile required" });
      return;
    }

    (req as AuthedCompanyRequest).company = company;
    next();
  };
}

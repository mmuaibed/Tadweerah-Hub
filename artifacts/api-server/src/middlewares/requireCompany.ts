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
 * Optionally restricts access to a list of company types — pages and
 * endpoints scoped to a single role can pass the allowed types here.
 */
export function requireCompany(
  allowedTypes?: ReadonlyArray<Company["type"]>,
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

    if (allowedTypes && !allowedTypes.includes(company.type)) {
      res.status(403).json({ error: "Forbidden for this company type" });
      return;
    }

    (req as AuthedCompanyRequest).company = company;
    next();
  };
}

import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, companyMembersTable, type Company } from "@workspace/db";
import type { AuthedRequest } from "./requireAuth";

export interface AuthedCompanyRequest extends AuthedRequest {
  company: Company;
  /** 'owner' | 'member' — the caller's role within the company */
  memberRole: "owner" | "member";
}

/**
 * Loads the company the authenticated user belongs to.
 * Looks up via the `company_members` join table so that both owners
 * and invited members can access the company.
 *
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
      .select({
        company: companiesTable,
        role: companyMembersTable.role,
      })
      .from(companyMembersTable)
      .innerJoin(companiesTable, eq(companiesTable.id, companyMembersTable.company_id))
      .where(eq(companyMembersTable.user_id, userId))
      .limit(1);

    const found = rows[0];
    if (!found) {
      res.status(403).json({ error: "Company profile required" });
      return;
    }

    (req as AuthedCompanyRequest).company = found.company;
    (req as AuthedCompanyRequest).memberRole = found.role as "owner" | "member";
    next();
  };
}

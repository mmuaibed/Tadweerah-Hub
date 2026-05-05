import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, companyMembersTable, type Company } from "@workspace/db";
import type { AuthedRequest } from "./requireAuth";

export interface AuthedCompanyRequest extends AuthedRequest {
  company: Company;
  /** 'owner' | 'member' — the caller's role within the company */
  memberRole: "owner" | "member";
}

export interface RequireCompanyOptions {
  /**
   * When true, companies with license_status = null or "pending" are allowed
   * to execute mutating requests. Use only for company profile / onboarding
   * routes where an unapproved company must be able to update its own data.
   *
   * Rejected companies are ALWAYS blocked from mutations regardless of this flag.
   */
  allowUnapproved?: boolean;
}

/**
 * Loads the company the authenticated user belongs to.
 * Looks up via the `company_members` join table so that both owners
 * and invited members can access the company.
 *
 * Must be used AFTER requireAuth.
 *
 * Approval gate (applied to all non-GET/HEAD requests):
 *   - rejected  → always blocked (403 CompanyRejected)
 *   - null      → blocked unless allowUnapproved=true (403 CompanyIncomplete)
 *   - pending   → blocked unless allowUnapproved=true (403 CompanyPending)
 *   - approved  → always allowed
 *
 * Pass { allowUnapproved: true } only for company profile update routes so
 * unapproved companies can still submit / update their profile for review.
 */
export function requireCompany(options: RequireCompanyOptions = {}) {
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

    const isMutation = req.method !== "GET" && req.method !== "HEAD";

    if (isMutation) {
      const ls = found.company.license_status;

      // Rejected — always blocked, even on profile routes.
      if (ls === "rejected") {
        res.status(403).json({
          error: "CompanyRejected",
          message:
            "Your company registration has been rejected. Please contact support.",
        });
        return;
      }

      // Incomplete / pending — blocked unless the route opts in (e.g. profile update).
      if (!options.allowUnapproved) {
        if (!ls) {
          res.status(403).json({
            error: "CompanyIncomplete",
            message:
              "Your company profile is incomplete. Complete your company data and submit it for review before performing this action.",
          });
          return;
        }
        if (ls === "pending") {
          res.status(403).json({
            error: "CompanyPending",
            message:
              "Your company is currently under review. You will be able to perform this action once approved.",
          });
          return;
        }
      }
    }

    (req as AuthedCompanyRequest).company = found.company;
    (req as AuthedCompanyRequest).memberRole = found.role as "owner" | "member";
    next();
  };
}

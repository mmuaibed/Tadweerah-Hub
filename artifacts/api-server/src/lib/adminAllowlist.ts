import { clerkClient } from "@clerk/express";

function getAdminAllowlist(): string[] {
  const raw = process.env.TADWEERAH_ADMIN_EMAILS ?? "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Server-side counterpart to the frontend's admin-email allowlist check
 * (VITE_TADWEERAH_ADMIN_EMAILS, see RouteGuard.tsx / topbar.tsx). The two
 * lists must be kept in sync by whoever configures the environment.
 *
 * Read-only use only. Never wire this into a mutation route — it exists
 * solely to let allowlisted admins view user-facing pages (e.g. a deal
 * inside a listing) for inspection, not to grant write access.
 *
 * Requires a VERIFIED Clerk email matching the allowlist — an unverified
 * email on the account is never sufficient, even if its address string
 * matches. A Clerk account can hold multiple email addresses; every one
 * of them is checked, not just the primary, so any verified address that
 * matches the allowlist grants access.
 */
export async function isAllowlistedAdmin(userId: string): Promise<boolean> {
  const allowlist = getAdminAllowlist();
  if (allowlist.length === 0) return false;

  const user = await clerkClient.users.getUser(userId);
  const hasVerifiedAllowlistedEmail = user.emailAddresses.some(
    (e) => e.verification?.status === "verified" && allowlist.includes(e.emailAddress.toLowerCase()),
  );

  return hasVerifiedAllowlistedEmail;
}

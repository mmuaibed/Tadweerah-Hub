# Tadweerah — Required Environment Variables

> Names only — no secret values included.
> Last updated: 2026-05-21

---

## 1. Database

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Required | Full PostgreSQL connection string — primary way the app connects |
| `PGHOST` | Replit-managed | Auto-set by Replit alongside DATABASE_URL |
| `PGPORT` | Replit-managed | |
| `PGDATABASE` | Replit-managed | |
| `PGUSER` | Replit-managed | |
| `PGPASSWORD` | Replit-managed | |

---

## 2. Clerk (Authentication)

| Variable | Required | Notes |
|---|---|---|
| `CLERK_SECRET_KEY` | Required | Backend — used by the API server to verify Clerk tokens |
| `CLERK_PUBLISHABLE_KEY` | Required | Backend — used by the Clerk proxy middleware |
| `VITE_CLERK_PUBLISHABLE_KEY` | Required | Frontend — initialises the Clerk React SDK |

---

## 3. Admin

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_API_KEY` | Required | Bearer token for protected admin API routes (/admin/*, /lookup writes) |
| `VITE_TADWEERAH_ADMIN_EMAILS` | Required | Comma-separated list of Clerk email addresses that can access the admin panel |

---

## 4. Resend / Email

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | Required | Authenticates all outbound email via Resend |
| `SUPPORT_EMAIL` | Required | Recipient address for incoming customer support issue notifications |
| `EMAIL_FROM` | Required | Sender address shown on all outbound emails (e.g. Tadweerah Support <support@yourdomain.com>) |

---

## 5. Frontend VITE Variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Required | Also listed under Clerk above |
| `VITE_TADWEERAH_ADMIN_EMAILS` | Required | Also listed under Admin above |
| `VITE_CLERK_PROXY_URL` | Optional | Override Clerk JS endpoint — only needed if using a custom Clerk proxy domain |

---

## 6. Optional / Future Services

| Variable | Required | Notes |
|---|---|---|
| `TRANSPORT_REQUEST_EMAIL` | Optional | Ops team email for transport request notifications — feature exists in code, not currently set |
| `PLATFORM_URL` | Optional | Base URL used in email deep-links — defaults to https://tadweerah.sa if not set |
| `LOG_LEVEL` | Optional | Server log verbosity (debug / info / warn / error) — defaults to info |
| `SESSION_SECRET` | Optional | Provisioned earlier in development; not actively referenced in current code |

---

## Replit-Managed (do not set manually)

| Variable | Notes |
|---|---|
| `REPLIT_DOMAINS` | Auto-injected — comma-separated public domain(s) for the deployment |
| `REPLIT_DEV_DOMAIN` | Auto-injected — dev preview domain |
| `REPL_ID` | Auto-injected — unique Repl identifier |
| `NODE_ENV` | Set by each workflow start script (development / production) |
| `PORT` | Set by Replit per-artifact — do not hardcode |
| `BASE_PATH` | Set by Replit per-artifact — used by Vite for asset routing |

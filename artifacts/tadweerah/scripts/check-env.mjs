// check-env.mjs
const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
const adminEmails = process.env.VITE_TADWEERAH_ADMIN_EMAILS;
const proxyUrl = process.env.VITE_CLERK_PROXY_URL;

let hasError = false;

if (!clerkKey) {
  console.error("❌ ERROR: VITE_CLERK_PUBLISHABLE_KEY is missing!");
  hasError = true;
} else {
  console.log("✅ VITE_CLERK_PUBLISHABLE_KEY is present.");
}

if (!adminEmails) {
  console.error("❌ ERROR: VITE_TADWEERAH_ADMIN_EMAILS is missing!");
  hasError = true;
} else {
  console.log("✅ VITE_TADWEERAH_ADMIN_EMAILS is present.");
}

if (proxyUrl) {
  console.error("❌ ERROR: VITE_CLERK_PROXY_URL should NOT be set!");
  hasError = true;
}

if (hasError) {
  console.error("Build failed due to missing or invalid environment variables.");
  process.exit(1);
}

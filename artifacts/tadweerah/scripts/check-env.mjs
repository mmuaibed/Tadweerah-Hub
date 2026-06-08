// check-env.mjs
const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
const adminEmails = process.env.VITE_TADWEERAH_ADMIN_EMAILS;
const proxyUrl = process.env.VITE_CLERK_PROXY_URL;

let hasError = false;

if (!clerkKey) {
  console.error("❌ ERROR: VITE_CLERK_PUBLISHABLE_KEY is missing!");
  hasError = true;
} else {
  // Check prefix
  if (!clerkKey.startsWith("pk_live_") && !clerkKey.startsWith("pk_test_")) {
    console.error("❌ ERROR: VITE_CLERK_PUBLISHABLE_KEY must start with pk_live_ or pk_test_");
    hasError = true;
  }
  
  // Check bad values
  const badValues = ["npm", "@clerk", "clerk-js", "undefined"];
  if (badValues.some(bad => clerkKey.includes(bad))) {
    console.error("❌ ERROR: VITE_CLERK_PUBLISHABLE_KEY contains forbidden substrings (npm, @clerk, etc.)");
    hasError = true;
  }

  // Decode and check domain
  try {
    const payload = clerkKey.startsWith("pk_live_") ? clerkKey.slice(8) : clerkKey.slice(8);
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    
    // Strict domain check!
    if (decoded !== "clerk.tadweerah.com$" && !decoded.startsWith("clerk.tadweerah.com$")) {
      console.error(`❌ ERROR: Decoded Clerk key does not match exact domain format (clerk.tadweerah.com$). Found: ${decoded}`);
      hasError = true;
    }
    
    // Reject known corrupted suffixes like $2
    if (decoded.includes("$2")) {
      console.error(`❌ ERROR: Decoded Clerk key contains corrupted suffix ($2). This breaks the Clerk SDK parser! Found: ${decoded}`);
      hasError = true;
    }
    
    const badDomains = ["replit.dev", "picard", "npm", "@clerk"];
    if (badDomains.some(bad => decoded.includes(bad))) {
      console.error(`❌ ERROR: Decoded Clerk key contains forbidden domain/substring. Found: ${decoded}`);
      hasError = true;
    }

    if (!hasError) {
      console.log(`✅ VITE_CLERK_PUBLISHABLE_KEY is valid for domain: ${decoded}`);
    }
  } catch (err) {
    console.error("❌ ERROR: Failed to decode VITE_CLERK_PUBLISHABLE_KEY payload.");
    hasError = true;
  }
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

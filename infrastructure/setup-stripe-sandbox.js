const fs = require("fs");
const path = require("path");

// Load environment variables if dotenv is available or present in .env
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
} catch (e) {}

const Stripe = require(path.resolve(__dirname, "../apps/api/node_modules/stripe"));

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY is required in environment or apps/api/.env");
  process.exit(1);
}
const DOMAIN = process.env.DOMAIN || "https://icandothat.online";
const WEBHOOK_URL = `${DOMAIN}/api/billing/webhook`;

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PLANS_CONFIG = [
  {
    tier: "STARTER",
    name: "Starter",
    description: "Single workspace/business, free website and business email. Full AI & SEO suite included.",
    monthlyAmount: 2500, // $25.00 USD
    annualAmount: 24000, // $240.00 USD
  },
  {
    tier: "PRO",
    name: "Pro",
    description: "Up to 10 businesses with full AI & SEO suite.",
    monthlyAmount: 4500, // $45.00 USD
    annualAmount: 43000, // $430.00 USD
  },
  {
    tier: "AGENCY",
    name: "Agency",
    description: "Up to 50 businesses with full AI & SEO suite.",
    monthlyAmount: 22000, // $220.00 USD
    annualAmount: 210000, // $2100.00 USD
  },
];

async function setup() {
  console.log("🚀 Setting up Stripe Sandbox for AI Visibility SEO...");

  // 1. Verify Account
  const account = await stripe.accounts.retrieve();
  console.log(`✔ Verified Stripe Account: ${account.id} (${account.business_profile?.name || account.settings?.dashboard?.display_name || account.email})`);

  // 2. Setup Products & Prices
  const createdPrices = {};

  for (const plan of PLANS_CONFIG) {
    console.log(`\n📦 Configuring Product: ${plan.name} (${plan.tier})...`);
    
    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['tier']:'${plan.tier}'`,
    }).catch(() => ({ data: [] }));

    let product = existingProducts.data[0];

    if (!product) {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          tier: plan.tier,
          platform: "aivisibility_seo",
        },
      });
      console.log(`  Created Product: ${product.id}`);
    } else {
      console.log(`  Found existing Product: ${product.id}`);
      await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description,
      });
      console.log(`  Updated Product info: ${plan.name}`);
    }

    // Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyAmount,
      currency: "usd",
      recurring: {
        interval: "month",
      },
      metadata: {
        tier: plan.tier,
        cycle: "monthly",
      },
    });
    console.log(`  Created Monthly Price: ${monthlyPrice.id} ($${plan.monthlyAmount / 100}/mo)`);
    createdPrices[`STRIPE_PRICE_${plan.tier}`] = monthlyPrice.id;
    createdPrices[`STRIPE_PRICE_${plan.tier}_MONTHLY`] = monthlyPrice.id;

    // Annual Price
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.annualAmount,
      currency: "usd",
      recurring: {
        interval: "year",
      },
      metadata: {
        tier: plan.tier,
        cycle: "annual",
      },
    });
    console.log(`  Created Annual Price: ${annualPrice.id} ($${plan.annualAmount / 100}/yr)`);
    createdPrices[`STRIPE_PRICE_${plan.tier}_ANNUAL`] = annualPrice.id;
  }

  // Alias GROWTH to PRO prices for backward compatibility
  if (createdPrices["STRIPE_PRICE_PRO"]) {
    createdPrices["STRIPE_PRICE_GROWTH"] = createdPrices["STRIPE_PRICE_PRO"];
    createdPrices["STRIPE_PRICE_GROWTH_MONTHLY"] = createdPrices["STRIPE_PRICE_PRO_MONTHLY"];
    createdPrices["STRIPE_PRICE_GROWTH_ANNUAL"] = createdPrices["STRIPE_PRICE_PRO_ANNUAL"];
  }

  // 3. Setup Webhook Endpoint
  console.log(`\n🔔 Configuring Webhook Endpoint (${WEBHOOK_URL})...`);
  const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 10 });
  const matchingWebhook = existingWebhooks.data.find(w => w.url === WEBHOOK_URL);

  let webhookSecret = "";
  if (matchingWebhook) {
    console.log(`  Webhook endpoint already registered: ${matchingWebhook.id}`);
    // Note: Stripe does not return existing signing secret on list, only on creation.
  } else {
    const webhook = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: [
        "checkout.session.completed",
        "invoice.paid",
        "invoice.payment_failed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ],
      description: "AIVisibility SEO Cloud Billing Webhook",
      metadata: {
        platform: "aivisibility_seo",
      },
    });
    console.log(`  Created Webhook Endpoint: ${webhook.id}`);
    webhookSecret = webhook.secret || "";
    console.log(`  Webhook Secret: ${webhookSecret ? webhookSecret.substring(0, 10) + "..." : "Not returned"}`);
  }

  // 4. Update root .env and apps/api/.env
  const envPaths = [
    path.resolve(__dirname, "..", ".env"),
    path.resolve(__dirname, "..", "apps", "api", ".env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");

      // Set default price ID
      createdPrices["STRIPE_PRICE_ID"] = createdPrices["STRIPE_PRICE_STARTER"];

      for (const [key, val] of Object.entries(createdPrices)) {
        const reg = new RegExp(`^${key}=.*$`, "m");
        if (reg.test(envContent)) {
          envContent = envContent.replace(reg, `${key}="${val}"`);
        } else {
          envContent += `\n${key}="${val}"`;
        }
      }

      if (webhookSecret) {
        const reg = /^STRIPE_WEBHOOK_SECRET=.*$/m;
        if (reg.test(envContent)) {
          envContent = envContent.replace(reg, `STRIPE_WEBHOOK_SECRET="${webhookSecret}"`);
        } else {
          envContent += `\nSTRIPE_WEBHOOK_SECRET="${webhookSecret}"`;
        }
      }

      fs.writeFileSync(envPath, envContent.trim() + "\n");
      console.log(`\n📋 Updated environment file: ${envPath}`);
    }
  }

  console.log("\n✅ Stripe Sandbox configuration finished successfully!");
  console.log("Configured Prices:");
  console.table(createdPrices);
  if (webhookSecret) {
    console.log(`Webhook Secret: ${webhookSecret}`);
  }
}

setup().catch(err => {
  console.error("Stripe sandbox setup failed:", err);
  process.exit(1);
});

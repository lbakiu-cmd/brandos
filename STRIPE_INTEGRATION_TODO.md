# Stripe Integration TODO & Configuration Guide

This document serves as the single source of truth for the Stripe Checkout integration in **AIVisibility SEO / BrandOS**.

---

## Values to Replace

The following values are placeholders and must be updated with your production or active Stripe Dashboard settings before going live.

**Files containing placeholders:**
- [apps/api/src/billing/billing.service.ts](apps/api/src/billing/billing.service.ts)
- [.env](.env)

| Field | Current Value | What to Set | Status |
| :--- | :--- | :--- | :--- |
| `mode` | `subscription` | Configured for recurring SaaS billing (`subscription`). Change to `payment` if offering one-time purchases. | ✅ Active |
| `success_url` | `https://icandothat.online/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true` | Post-payment success page URL. Preserves the `{CHECKOUT_SESSION_ID}` template parameter. | ✅ Configured |
| `cancel_url` | `https://icandothat.online/pricing?canceled=true` | Cancel / return page URL when a customer exits Stripe Checkout without completing payment. | ✅ Configured |
| `STRIPE_PRICE_STARTER` | `price_1UDoPqKgpfCmPjbFV3qofGDJ` | Starter Growth plan ($49/mo). | ✅ Created in Sandbox |
| `STRIPE_PRICE_GROWTH` | `price_1UDoPrKgpfCmPjbF1H2AWyXb` | AI Dominance plan ($99/mo). | ✅ Created in Sandbox |
| `STRIPE_PRICE_AGENCY` | `price_1UDoPsKgpfCmPjbFZ1b8AcDj` | Agency / Enterprise plan ($299/mo). | ✅ Created in Sandbox |
| `STRIPE_WEBHOOK_SECRET` | `whsec_8WL6xvA7uDXUKQWeFN2b6bFb2wS5PbMg` | Signing secret for endpoint `we_1UDoPtKgpfCmPjbFh3rV0YdE`. | ✅ Active & Registered |

---

## Configured Parameters

These parameters were configured in Checkout Studio and have been implemented exactly according to Field Intents in [`apps/api/src/billing/billing.service.ts`](apps/api/src/billing/billing.service.ts).

**Files containing these parameters:**
- [apps/api/src/billing/billing.service.ts](apps/api/src/billing/billing.service.ts)
- [apps/api/src/billing/billing.controller.ts](apps/api/src/billing/billing.controller.ts)

| Parameter | Configured Value | Description |
| :--- | :--- | :--- |
| `ui_mode` | `hosted_page` | Uses Stripe-hosted checkout page. (SDK version `22.6.1` >= `21.0.0` uses `hosted_page`). |
| `billing_address_collection` | `auto` | Automatically collects billing address when necessary. |
| `phone_number_collection` | `{ enabled: false }` | Phone number collection disabled. |
| `automatic_tax` | `{ enabled: false }` | Automated Stripe tax calculation disabled. |
| `allow_promotion_codes` | `false` | Promo code input box hidden in Checkout. |
| `payment_method_collection` | `always` | Mandatory payment method capture for recurring subscription renewals. |
| `submit_type` | `auto` | Standard submission button text. |
| `integration_identifier` | `hosted_web_0001` | Unique integration telemetry ID. |
| `origin_context` | `web` | Origin source identifier. |

---

## Setup Instructions

### 1. Environment Variables
Add or verify these environment variables in your server `.env` file (`apps/api/.env` and root `.env`):

```bash
# Browser-accessible Stripe publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51UCCrVKgpfCmPjbFrkRKDpVINXxCKcdUBih8o9MEK8oKnydqhBsUvqyiaU1CC1PvsDpeqnRnfEn1cCPwEMTge2W500UP9zErYI
STRIPE_PUBLISHABLE_KEY=pk_test_51UCCrVKgpfCmPjbFrkRKDpVINXxCKcdUBih8o9MEK8oKnydqhBsUvqyiaU1CC1PvsDpeqnRnfEn1cCPwEMTge2W500UP9zErYI

# Server-only Stripe secret key (do NOT expose to browser)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook signing secret (from Stripe Dashboard -> Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Base domain of the application
DOMAIN=https://icandothat.online

# Optional: Specific Stripe Price IDs per subscription tier
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_AGENCY=price_...
```

### 2. Dependencies
The official Stripe SDK is installed in the API package:
- Package: `stripe` (`^22.6.1`) in [`apps/api/package.json`](apps/api/package.json).

---

## Project Structure & Endpoints

### Server Endpoints:
- `POST /billing/create-checkout-session` ([`apps/api/src/billing/billing.controller.ts`](apps/api/src/billing/billing.controller.ts)):
  - Generates a Stripe Hosted Checkout Session.
  - Returns `{ sessionId: string, url: string }` or performs a `303 Redirect` to `session.url` for form submissions.
  - Automatically associates the session with the user's business (`client_reference_id`, `metadata.businessId`, `metadata.tier`).
- `POST /billing/webhook` ([`apps/api/src/billing/billing.controller.ts`](apps/api/src/billing/billing.controller.ts)):
  - Listens for webhook events from Stripe.
  - Verifies signature using `STRIPE_WEBHOOK_SECRET`.

---

## How the Integration Works

1. **Checkout Initiation**:
   A user selects a subscription tier on the pricing page or in the billing dashboard. A request is sent to `POST /billing/create-checkout-session`.
2. **Redirect to Stripe**:
   The user is redirected to Stripe's secure hosted page (`checkout.stripe.com`) displaying the plan details.
3. **Completion & Fulfillment**:
   Upon entering valid payment details and clicking Subscribe:
   - The customer is redirected to the `success_url` (`/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`).
   - Stripe asynchronously triggers the `checkout.session.completed` webhook event.
   - The webhook handler automatically updates the `Business` model in the database:
     - `subscriptionTier`: updated to selected tier (e.g., `STARTER`, `GROWTH`, `AGENCY`).
     - `subscriptionStatus`: set to `active`.
     - `stripeCustomerId` & `stripeSubscriptionId`: stored in database.
     - `currentPeriodEnd`: extended by 30 days.
4. **Subsequent Monthly Renewals**:
   - Every renewal trigger sends `invoice.paid`, updating `currentPeriodEnd`.
   - If payment fails, `invoice.payment_failed` updates `subscriptionStatus` to `past_due`.
   - If canceled via Stripe, `customer.subscription.deleted` downgrades the tier to `FREE`.

---

## Testing & Test Mode Cards

You can test the checkout flow using standard Stripe test cards:
- **Card Number**: `4242 4242 4242 4242`
- **Expiration**: Any future date (e.g. `12/28`)
- **CVC**: Any 3 digits (e.g. `123`)
- **Postal Code**: Any valid postal code (e.g. `90210`)

---

## Next Steps

1. **Create Products & Prices in Stripe Dashboard**:
   - Go to [https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products).
   - Create your recurring subscription products:
     - **Starter Growth** ($49/month)
     - **AI Dominance** ($99/month)
     - **Agency / Enterprise** ($299/month)
   - Copy each Price ID (formatted as `price_1...`) into your `.env` file under `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_AGENCY`.
2. **Register Webhook Endpoint in Stripe**:
   - Go to [https://dashboard.stripe.com/workbench/webhooks](https://dashboard.stripe.com/workbench/webhooks).
   - Add endpoint URL: `https://icandothat.online/api/billing/webhook`.
   - Select events to listen to:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
   - Copy the generated Signing Secret (`whsec_...`) and update `STRIPE_WEBHOOK_SECRET` in `.env`.

---

## Resources
- Stripe Support: [https://support.stripe.com](https://support.stripe.com)
- Stripe Documentation & MCP: [https://docs.stripe.com/mcp](https://docs.stripe.com/mcp)
- Stripe Checkout Guide: [https://docs.stripe.com/checkout](https://docs.stripe.com/checkout)

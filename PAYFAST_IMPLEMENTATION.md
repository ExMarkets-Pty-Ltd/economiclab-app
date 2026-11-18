# EconomicLab PayFast implementation

## Sandbox setup

1. Configure the PayFast sandbox merchant account.
2. Set the required variables in Netlify.
3. Apply the Supabase migrations, including `20261118000001_payfast_subscription_architecture.sql` and `20261118000002_premium_usage.sql`.
4. Configure `PAYFAST_NOTIFY_URL` to the deployed `/.netlify/functions/payfast-itn` endpoint.
5. Complete a sandbox checkout using a plan with `is_active = true`.

## Required environment variables

- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- `PAYFAST_MODE`: `sandbox` or `production`
- `PAYFAST_RETURN_URL`
- `PAYFAST_CANCEL_URL`
- `PAYFAST_NOTIFY_URL`
- `PAYFAST_ALLOWED_IPS`: optional comma-separated IP allowlist
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ECONOMICLAB_AI_ADAPTER_URL`
- `ECONOMICLAB_AI_ADAPTER_KEY`
- `ECONOMICLAB_AI_MODEL`: optional adapter model identifier

The Supabase service-role key must only exist in Netlify server environment variables.
The AI adapter URL and key are server-only. Configure an HTTPS adapter endpoint
that accepts JSON `{ "prompt": "...", "model": "..." }` with bearer authentication
and returns JSON `{ "text": "...", "citations": [] }`. No AI provider is selected
or configured by this repository; without an adapter URL and key, AI requests
return HTTP 503 rather than a fabricated response.

## Recurring billing

Plans with `billing_interval = month` or `year` generate hosted PayFast recurring
subscriptions. PayFast recurring subscriptions require a credit card. One-time
plans do not generate recurring fields.

The first checkout and recurring notifications must pass server-side amount,
merchant, signature, source-IP, and PayFast validation checks before entitlement
records are activated.

## Security operations

- Browser redirects never activate a subscription.
- `/ai` and `/forecasting` require server-confirmed entitlements in the UI.
- `/.netlify/functions/ai` and `/.netlify/functions/forecasting` independently
  verify the bearer token, current server-side subscription and feature permission.
- Active plans must define feature permissions such as `ai` and `forecasting` in
  their trusted `plans.features` data (or have matching server-created
  `subscription_entitlements` rows).
- AI operations are limited to 30 requests per user per UTC day; forecasting
  operations are limited to 120. The atomic counters use the
  `consume_premium_usage` service-role-only function.
- Forecasting responses are served only after server authorization. The current
  values remain illustrative samples, not a live forecasting feed.
- Subscription and entitlement writes are reserved for server-side service-role
  operations.
- ITN processing is idempotent and repeated PayFast notifications do not extend
  the billing period when the same provider payment ID is already completed.

## Before production

Complete sandbox tests for initial payment, recurring payment, failures,
cancellation, expiry, invalid signatures, invalid amounts, duplicate ITNs,
inactive plans, unauthorized checkout, and insufficient feature permissions.

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEntitlement, normalizePlanFeatures } from "../functions/_shared/entitlement.mjs";
import { payFastSignature, parseFormEncoded } from "../functions/_shared/payfast.mjs";
import { getAdminSupabase } from "../functions/_shared/supabase.mjs";
import { createPayFastItnHandler } from "../functions/payfast-itn.mjs";

test("active subscriptions grant plan permissions", () => {
  const result = evaluateEntitlement({
    subscription: { id: "sub-1", status: "active", expires_at: null },
    plan: { is_active: true, features: ["ai", "forecasting"] },
  });
  assert.equal(result.granted, true);
  assert.deepEqual(result.permissions, ["ai", "forecasting"]);
});

test("expired subscriptions do not grant access", () => {
  const result = evaluateEntitlement({
    subscription: {
      id: "sub-1",
      status: "active",
      expires_at: "2020-01-01T00:00:00.000Z",
    },
    plan: { is_active: true, features: ["ai"] },
  });
  assert.equal(result.granted, false);
  assert.equal(result.reason, "subscription_expired");
});

test("past_due subscriptions are denied", () => {
  const result = evaluateEntitlement({
    subscription: { id: "sub-1", status: "past_due", expires_at: null },
    plan: { is_active: true, features: ["ai"] },
  });
  assert.equal(result.granted, false);
});

test("inactive plans are denied", () => {
  const result = evaluateEntitlement({
    subscription: { id: "sub-1", status: "active", expires_at: null },
    plan: { is_active: false, features: ["ai", "forecasting"] },
  });
  assert.equal(result.granted, false);
  assert.equal(result.reason, "plan_inactive");
});

test("plan-specific permissions are not granted across features", () => {
  const result = evaluateEntitlement({
    subscription: { id: "sub-1", status: "active", expires_at: null },
    plan: { is_active: true, features: ["forecasting"] },
  });
  assert.equal(result.granted, true);
  assert.deepEqual(result.permissions, ["forecasting"]);
  assert.equal(result.permissions.includes("ai"), false);
});

test("trialing subscriptions expire at the trial period end", () => {
  const result = evaluateEntitlement({
    subscription: {
      id: "sub-1",
      status: "trialing",
      expires_at: "2020-01-01T00:00:00.000Z",
    },
    plan: { is_active: true, features: ["ai"] },
  });
  assert.equal(result.granted, false);
  assert.equal(result.reason, "subscription_expired");
});

test("expired feature grants do not fall back to plan features", () => {
  const result = evaluateEntitlement({
    subscription: { id: "sub-1", status: "active", expires_at: null },
    plan: { is_active: true, features: ["ai"] },
    entitlements: [{
      subscription_id: "sub-1",
      permission: "ai",
      expires_at: "2020-01-01T00:00:00.000Z",
    }],
  });
  assert.equal(result.granted, false);
  assert.deepEqual(result.permissions, []);
});

test("plan features can contain permission objects", () => {
  assert.deepEqual(
    normalizePlanFeatures([
      "ai",
      { permission: "forecasting" },
      { name: "ignored" },
    ]),
    ["ai", "forecasting"],
  );
});

test("PayFast signature is deterministic and excludes signature", () => {
  const passphrase = "test-passphrase";
  const signature = payFastSignature({
    merchant_id: "100001",
    amount: "100.00",
    signature: "ignored",
  }, passphrase);
  assert.match(signature, /^[a-f0-9]{32}$/);
  assert.equal(
    signature,
    payFastSignature({
      merchant_id: "100001",
      amount: "100.00",
    }, passphrase),
  );
});

test("form encoded PayFast values are parsed", () => {
  const params = parseFormEncoded("payment_status=COMPLETE&m_payment_id=EL-123&name=EconomicLab");
  assert.equal(params.payment_status, "COMPLETE");
  assert.equal(params.m_payment_id, "EL-123");
});

test("ITN returns a safe 500 when Supabase server configuration is unavailable", async (t) => {
  t.mock.method(console, "error", () => {});
  const handler = createPayFastItnHandler(() => getAdminSupabase({}));
  const response = await handler(new Request("https://economiclab.test/payfast-itn", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "",
  }));

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to process notification." });
});

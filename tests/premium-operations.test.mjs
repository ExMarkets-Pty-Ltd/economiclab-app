import test from "node:test";
import assert from "node:assert/strict";
import { createAiOperationHandler } from "../functions/ai.mjs";
import { evaluateEntitlement } from "../functions/_shared/entitlement.mjs";
import { createPremiumOperationHandler } from "../functions/_shared/premium-operation.mjs";
import { requireUser } from "../functions/_shared/supabase.mjs";

const user = { id: "user-1" };
const activePlan = { is_active: true, features: ["ai", "forecasting"] };

function createHandler({
  permission,
  subscription = { id: "subscription-1", status: "active", expires_at: null },
  plan = activePlan,
  entitlements = [],
  allowedUsage = true,
  execute = async () => ({ success: true }),
}) {
  let executions = 0;
  const handler = createPremiumOperationHandler({
    permission,
    method: "POST",
    dailyLimit: 10,
    authenticate: async (request) => (
      request.headers.get("authorization") === "Bearer valid-token"
        ? { user, supabase: {} }
        : null
    ),
    loadEntitlement: async () => evaluateEntitlement({ subscription, plan, entitlements }),
    consumeUsage: async () => ({ allowed: allowedUsage, resetAt: null }),
    execute: async (context) => {
      executions += 1;
      return execute(context);
    },
  });
  return { handler, getExecutions: () => executions };
}

function postRequest(body, token = "valid-token") {
  return new Request("https://economiclab.test/.netlify/functions/ai", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
}

test("missing bearer token is rejected before entitlement checks", async () => {
  let clientCreated = false;
  const result = await requireUser(
    new Request("https://economiclab.test/private"),
    () => {
      clientCreated = true;
      return {};
    },
  );
  assert.equal(result, null);
  assert.equal(clientCreated, false);
});

test("invalid bearer token is rejected by Supabase user verification", async () => {
  let verifiedToken = "";
  const result = await requireUser(
    new Request("https://economiclab.test/private", {
      headers: { authorization: "Bearer invalid-token" },
    }),
    () => ({
      auth: {
        getUser: async (token) => {
          verifiedToken = token;
          return { data: { user: null }, error: new Error("Invalid token") };
        },
      },
    }),
  );
  assert.equal(verifiedToken, "invalid-token");
  assert.equal(result, null);
});

test("expired subscriptions are denied at the backend", async () => {
  const { handler, getExecutions } = createHandler({
    permission: "ai",
    subscription: {
      id: "subscription-1",
      status: "active",
      expires_at: "2020-01-01T00:00:00.000Z",
    },
  });
  const response = await handler(postRequest({ prompt: "hello" }));
  assert.equal(response.status, 403);
  assert.equal(getExecutions(), 0);
});

test("active subscription without AI permission is denied", async () => {
  const { handler, getExecutions } = createHandler({
    permission: "ai",
    plan: { is_active: true, features: ["forecasting"] },
  });
  const response = await handler(postRequest({ prompt: "hello" }));
  assert.equal(response.status, 403);
  assert.equal(getExecutions(), 0);
});

test("active subscription with AI permission may execute", async () => {
  const { handler, getExecutions } = createHandler({ permission: "ai" });
  const response = await handler(postRequest({ prompt: "hello" }));
  assert.equal(response.status, 200);
  assert.equal(getExecutions(), 1);
});

test("active subscription without forecasting permission is denied", async () => {
  const { handler, getExecutions } = createHandler({
    permission: "forecasting",
    plan: { is_active: true, features: ["ai"] },
  });
  const response = await handler(postRequest({}));
  assert.equal(response.status, 403);
  assert.equal(getExecutions(), 0);
});

test("forecasting permission is accepted by the server authorization layer", async () => {
  const { handler, getExecutions } = createHandler({
    permission: "forecasting",
    execute: async () => ({ forecasts: ["server-only"] }),
  });
  const response = await handler(postRequest({}));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { forecasts: ["server-only"] });
  assert.equal(getExecutions(), 1);
});

test("missing AI adapter configuration returns an explicit service error", async () => {
  let usageConsumed = false;
  const handler = createAiOperationHandler({
    env: {},
    authenticate: async () => ({ user, supabase: {} }),
    loadEntitlement: async () => evaluateEntitlement({
      subscription: { id: "subscription-1", status: "active" },
      plan: activePlan,
    }),
    consumeUsage: async () => {
      usageConsumed = true;
      return { allowed: true };
    },
  });
  const response = await handler(postRequest({ prompt: "hello" }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "ai_provider_not_configured");
  assert.equal(usageConsumed, false);
});

test("frontend-supplied subscription state cannot grant backend access", async () => {
  const { handler, getExecutions } = createHandler({
    permission: "ai",
    plan: { is_active: true, features: [] },
  });
  const response = await handler(postRequest({
    prompt: "hello",
    subscription: { status: "active" },
    entitlement: { granted: true, permissions: ["ai"] },
  }));
  assert.equal(response.status, 403);
  assert.equal(getExecutions(), 0);
});

test("usage limits reject operations after entitlement verification", async () => {
  const { handler, getExecutions } = createHandler({
    permission: "ai",
    allowedUsage: false,
  });
  const response = await handler(postRequest({ prompt: "hello" }));
  assert.equal(response.status, 429);
  assert.equal(getExecutions(), 0);
});

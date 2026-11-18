import { getUserEntitlement } from "./entitlement.mjs";
import { requireUser } from "./supabase.mjs";

export class PremiumOperationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createPremiumOperationHandler({
  permission,
  method,
  dailyLimit,
  authenticate = requireUser,
  loadEntitlement = getUserEntitlement,
  consumeUsage,
  prepare = async () => null,
  execute,
}) {
  return async function premiumOperation(request) {
    if (request.method !== method) {
      return json({ error: "Method not allowed.", code: "method_not_allowed" }, 405, {
        allow: method,
      });
    }

    try {
      const auth = await authenticate(request);
      if (!auth) {
        return json({ error: "A valid bearer token is required.", code: "unauthorized" }, 401);
      }

      const entitlement = await loadEntitlement(auth.supabase, auth.user.id);
      if (!entitlement.permissions?.includes(permission)) {
        const code = entitlement.reason || "permission_required";
        return json({
          error: "Your subscription does not include this feature.",
          code,
          required_permission: permission,
        }, 403);
      }

      const prepared = await prepare(request, { ...auth, entitlement });
      if (prepared instanceof Response) return noStore(prepared);

      const usage = await consumeUsage(
        auth.supabase,
        auth.user.id,
        permission,
        dailyLimit,
      );
      if (!usage.allowed) {
        return json({
          error: "The daily usage limit for this feature has been reached.",
          code: "usage_limit_exceeded",
          reset_at: usage.resetAt ?? null,
        }, 429, { "retry-after": String(usage.retryAfterSeconds ?? 60) });
      }

      const result = await execute({
        ...auth,
        entitlement,
        prepared,
        usage,
      });
      return json(result, 200);
    } catch (error) {
      if (error instanceof PremiumOperationError) {
        return json({ error: error.message, code: error.code }, error.status);
      }
      console.error(`Premium ${permission} operation failed:`, error);
      return json({ error: "The premium operation could not be completed.", code: "operation_failed" }, 500);
    }
  };
}

export async function consumePremiumUsage(supabase, userId, permission, dailyLimit) {
  const { data, error } = await supabase.rpc("consume_premium_usage", {
    p_user_id: userId,
    p_permission: permission,
    p_daily_limit: dailyLimit,
  });
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.allowed !== "boolean") {
    throw new Error("Usage limit service returned an invalid response.");
  }
  const resetAt = result.reset_at ? new Date(result.reset_at) : null;
  return {
    allowed: result.allowed,
    resetAt: resetAt?.toISOString() ?? null,
    retryAfterSeconds: resetAt
      ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
      : 60,
  };
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

async function noStore(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

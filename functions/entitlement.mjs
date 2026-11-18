import { getUserEntitlement } from "./_shared/entitlement.mjs";
import { requireUser } from "./_shared/supabase.mjs";

export default async function entitlement(request) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const auth = await requireUser(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, user } = auth;

    const entitlement = await getUserEntitlement(supabase, user.id);
    const { subscription, plan } = entitlement;
    return Response.json({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            expires_at: subscription.current_period_end || subscription.expires_at,
            next_billing_at: subscription.next_billing_at,
            canceled_at: subscription.canceled_at,
          }
        : null,
      plan: plan ? { id: plan.id, name: plan.name, billing_interval: plan.billing_interval } : null,
      granted: entitlement.granted,
      permissions: entitlement.permissions,
      reason: entitlement.reason,
    });
  } catch (error) {
    console.error("Unable to evaluate entitlement:", error);
    return Response.json({ error: "Unable to evaluate entitlement." }, { status: 500 });
  }
}

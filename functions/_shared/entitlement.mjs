export function evaluateEntitlement({ subscription, plan, entitlements = [] }) {
  if (!subscription) return { granted: false, permissions: [], reason: "subscription_required" };
  if (!plan?.is_active) return { granted: false, permissions: [], reason: "plan_inactive" };

  const now = new Date();
  const periodEnd = subscription.current_period_end || subscription.expires_at;
  const periodEndDate = periodEnd ? new Date(periodEnd) : null;
  const periodExpired = periodEndDate && periodEndDate <= now;

  if (periodExpired && ["active", "trialing", "past_due", "canceled"].includes(subscription.status)) {
    return { granted: false, permissions: [], reason: "subscription_expired" };
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    const subscriptionEntitlements = entitlements.filter((row) =>
      !row.subscription_id || row.subscription_id === subscription.id);
    const permissions = subscriptionEntitlements
      .filter((row) =>
        !rowExpired(row, now))
      .map((row) => row.permission);

    if (subscriptionEntitlements.length === 0) {
      for (const feature of normalizePlanFeatures(plan.features)) {
        if (feature) permissions.push(feature);
      }
    }
    return { granted: permissions.length > 0, permissions: [...new Set(permissions)], reason: "entitled" };
  }

  if (subscription.status === "canceled" && subscription.canceled_at && periodEndDate && periodEndDate > now) {
    const permissions = entitlements
      .filter((row) =>
        !rowExpired(row, now) &&
        (!row.subscription_id || row.subscription_id === subscription.id))
      .map((row) => row.permission);
    return { granted: permissions.length > 0, permissions: [...new Set(permissions)], reason: "paid_through" };
  }

  return { granted: false, permissions: [], reason: "subscription_not_active" };
}

export async function getUserEntitlement(supabase, userId) {
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20);
  if (subscriptionError) throw subscriptionError;

  const subscriptionRows = subscriptions || [];
  const subscription = subscriptionRows.find((row) =>
    ["active", "trialing", "canceled"].includes(row.status))
    || subscriptionRows.find((row) => row.status === "past_due")
    || subscriptionRows[0]
    || null;

  let plan = null;
  let entitlements = [];
  if (subscription?.plan_id) {
    const [{ data: planData, error: planError }, { data: entitlementData, error: entitlementError }] =
      await Promise.all([
        supabase.from("plans").select("*").eq("id", subscription.plan_id).maybeSingle(),
        supabase
          .from("subscription_entitlements")
          .select("*")
          .eq("user_id", userId)
          .eq("subscription_id", subscription.id),
      ]);
    if (planError) throw planError;
    if (entitlementError) throw entitlementError;
    plan = planData;
    entitlements = entitlementData || [];
  }

  return {
    subscription,
    plan,
    ...evaluateEntitlement({ subscription, plan, entitlements }),
  };
}

function rowExpired(row, now) {
  return Boolean(row.expires_at && new Date(row.expires_at) <= now);
}

export function normalizePlanFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature) => {
    if (typeof feature === "string") return [feature];
    if (feature && typeof feature.permission === "string") return [feature.permission];
    return [];
  });
}

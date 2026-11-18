import { getClientIp, isTrustedPayFastIp, parseFormEncoded, payFastSignature } from "./_shared/payfast.mjs";
import { getAdminSupabase } from "./_shared/supabase.mjs";
import { normalizePlanFeatures } from "./_shared/entitlement.mjs";

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function addBillingPeriod(date, interval) {
  const next = new Date(date);
  if (interval === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

export default async function payFastItn(request) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const rawBody = await request.text();
  const params = parseFormEncoded(rawBody);
  const supabase = getAdminSupabase();
  const providerReference = params.pf_payment_id || params.m_payment_id || null;
  let payment = null;

  async function recordEvent(status, verificationResult, errorMessage = null) {
    if (!providerReference && !params.m_payment_id) return;
    await supabase
      .from("payment_events")
      .insert({
        payment_id: payment?.id || null,
        provider_reference: providerReference,
        event_type: params.payment_status ? `payfast.${params.payment_status.toLowerCase()}` : "payfast.itn",
        processing_status: status,
        verification_result: verificationResult,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
        payload: params,
      });
  }

  try {
    const ip = getClientIp(request);
    if (!isTrustedPayFastIp(ip)) {
      await recordEvent("rejected", "invalid_source_ip", `Untrusted source IP: ${ip || "unknown"}`);
      return jsonResponse({ error: "Invalid notification source." }, 403);
    }

    const suppliedSignature = params.signature;
    const expectedSignature = payFastSignature(params, process.env.PAYFAST_PASSPHRASE || "");
    if (!suppliedSignature || suppliedSignature.toLowerCase() !== expectedSignature.toLowerCase()) {
      await recordEvent("rejected", "invalid_signature", "PayFast signature verification failed.");
      return jsonResponse({ error: "Invalid signature." }, 400);
    }

    if (params.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      await recordEvent("rejected", "invalid_merchant", "Merchant ID did not match.");
      return jsonResponse({ error: "Invalid merchant." }, 400);
    }

    const mode = (process.env.PAYFAST_MODE || "sandbox").toLowerCase();
    const validationUrl = mode === "production"
      ? "https://www.payfast.co.za/eng/process/validate"
      : "https://sandbox.payfast.co.za/eng/process/validate";
    const validationResponse = await fetch(validationUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const validationText = (await validationResponse.text()).trim();
    if (!validationResponse.ok || validationText !== "VALID") {
      await recordEvent("rejected", "invalid_validation_response", `PayFast returned ${validationText || validationResponse.status}`);
      return jsonResponse({ error: "PayFast validation failed." }, 400);
    }

    if (!params.m_payment_id) {
      await recordEvent("rejected", "missing_payment_reference", "m_payment_id is missing.");
      return jsonResponse({ error: "Missing payment reference." }, 400);
    }

    const { data: pendingPayment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("*")
      .eq("internal_reference", params.m_payment_id)
      .maybeSingle();
    if (paymentLookupError) throw paymentLookupError;
    payment = pendingPayment;
    if (!payment) {
      await recordEvent("rejected", "unknown_payment_reference", "Payment reference was not found.");
      return jsonResponse({ error: "Unknown payment reference." }, 400);
    }

    const expectedAmount = Number(payment.amount).toFixed(2);
    const notifiedAmount = Number(params.amount_gross).toFixed(2);
    if (!params.amount_gross || notifiedAmount !== expectedAmount) {
      await recordEvent("rejected", "invalid_amount", `Expected ${expectedAmount}, received ${params.amount_gross || "none"}.`);
      return jsonResponse({ error: "Invalid payment amount." }, 400);
    }

    if (params.payment_status !== "COMPLETE") {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          provider_payment_id: params.pf_payment_id || null,
          provider_metadata: params,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      await recordEvent("accepted", "valid_failed_payment", null);
      return jsonResponse({ received: true });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", payment.subscription_id)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription || subscription.user_id !== payment.user_id || subscription.plan_id !== payment.plan_id) {
      await recordEvent("rejected", "subscription_mismatch", "Subscription, user, or plan mismatch.");
      return jsonResponse({ error: "Subscription mismatch." }, 400);
    }

    if (params.pf_payment_id) {
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id, status")
        .eq("provider_payment_id", params.pf_payment_id)
        .maybeSingle();
      if (
        existingPayment?.status === "completed"
        && subscription.status === "active"
        && (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())
      ) {
        await recordEvent("ignored", "duplicate_notification", null);
        return jsonResponse({ received: true });
      }
    }

    const now = new Date();
    const previousPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;
    const periodStart = previousPeriodEnd && previousPeriodEnd > now
      ? previousPeriodEnd.toISOString()
      : now.toISOString();
    const periodEnd = addBillingPeriod(periodStart, subscription.billing_interval || "month");
    const providerToken = params.token || subscription.provider_subscription_token || null;

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        provider_payment_id: params.pf_payment_id || null,
        payment_at: now.toISOString(),
        provider_metadata: params,
        updated_at: now.toISOString(),
      })
      .eq("id", payment.id);
    if (paymentUpdateError) throw paymentUpdateError;

    const { error: subscriptionUpdateError } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        started_at: subscription.started_at || now.toISOString(),
        expires_at: periodEnd,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        next_billing_at: periodEnd,
        provider_subscription_token: providerToken,
        last_payment_at: now.toISOString(),
        failure_code: null,
        failure_reason: null,
        provider_synced_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", subscription.id);
    if (subscriptionUpdateError) throw subscriptionUpdateError;

    const { data: plan } = await supabase
      .from("plans")
      .select("features")
      .eq("id", subscription.plan_id)
      .maybeSingle();
    const permissions = normalizePlanFeatures(plan?.features);

    await supabase
      .from("subscription_entitlements")
      .delete()
      .eq("subscription_id", subscription.id);
    if (permissions.length) {
      const rows = permissions.map((permission) => ({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        permission,
        expires_at: periodEnd,
        source: "payfast",
      }));
      const { error: entitlementError } = await supabase
        .from("subscription_entitlements")
        .insert(rows);
      if (entitlementError) throw entitlementError;
    }

    await recordEvent("accepted", "valid", null);
    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Unable to process PayFast ITN:", error);
    await recordEvent("failed", "processing_error", error.message);
    return jsonResponse({ error: "Unable to process notification." }, 500);
  }
}

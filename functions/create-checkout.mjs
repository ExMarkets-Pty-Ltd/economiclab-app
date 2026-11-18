import { randomUUID } from "node:crypto";
import { payFastSignature } from "./_shared/payfast.mjs";
import { requireUser } from "./_shared/supabase.mjs";

export default async function createCheckout(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const auth = await requireUser(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const planId = typeof body.planId === "string" ? body.planId : "";
    if (!planId) return Response.json({ error: "A planId is required." }, { status: 400 });

    const { supabase, user } = auth;
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, name, description, price, billing_interval, features, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return Response.json({ error: "Plan not found." }, { status: 404 });
    if (!plan.is_active) return Response.json({ error: "Plan is inactive." }, { status: 409 });

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";
    if (!merchantId || !merchantKey) {
      return Response.json({ error: "PayFast checkout is not configured." }, { status: 503 });
    }

    const internalReference = `EL-${randomUUID()}`;
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "incomplete",
        provider: "payfast",
        internal_reference: internalReference,
        billing_interval: plan.billing_interval,
        provider_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (subscriptionError) throw subscriptionError;

    const amount = Number(plan.price).toFixed(2);
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        plan_id: plan.id,
        internal_reference: internalReference,
        amount,
        currency: "ZAR",
        status: "pending",
        provider_metadata: { checkout_created: true },
      });
    if (paymentError) throw paymentError;

    const mode = (process.env.PAYFAST_MODE || "sandbox").toLowerCase();
    const destination = mode === "production"
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";

    const parameters = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: process.env.PAYFAST_RETURN_URL,
      cancel_url: process.env.PAYFAST_CANCEL_URL,
      notify_url: process.env.PAYFAST_NOTIFY_URL,
      name_first: user.user_metadata?.full_name?.split(" ")[0] || "",
      name_last: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
      email_address: user.email || "",
      m_payment_id: internalReference,
      amount,
      item_name: plan.name,
      item_description: plan.description || "",
    };

    if (plan.billing_interval === "month" || plan.billing_interval === "year") {
      parameters.subscription_type = "1";
      parameters.recurring_amount = amount;
      parameters.frequency = plan.billing_interval === "month" ? "3" : "6";
      parameters.cycles = "0";
    }

    Object.keys(parameters).forEach((key) => {
      if (parameters[key] === undefined || parameters[key] === null || parameters[key] === "") {
        delete parameters[key];
      }
    });
    parameters.signature = payFastSignature(parameters, passphrase);

    return Response.json({
      destination,
      parameters,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("Unable to create PayFast checkout:", error);
    return Response.json({ error: "Unable to create checkout." }, { status: 500 });
  }
}

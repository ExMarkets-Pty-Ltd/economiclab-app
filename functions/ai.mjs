import { createPremiumOperationHandler, consumePremiumUsage, PremiumOperationError } from "./_shared/premium-operation.mjs";

function providerConfiguration(env) {
  const endpoint = env.ECONOMICLAB_AI_ADAPTER_URL;
  const apiKey = env.ECONOMICLAB_AI_ADAPTER_KEY;
  if (!endpoint || !apiKey) {
    throw new PremiumOperationError(
      503,
      "ai_provider_not_configured",
      "The EconomicLab AI service is not configured.",
    );
  }

  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new PremiumOperationError(
      503,
      "ai_provider_misconfigured",
      "The EconomicLab AI service endpoint is invalid.",
    );
  }
  if (url.protocol !== "https:") {
    throw new PremiumOperationError(
      503,
      "ai_provider_misconfigured",
      "The EconomicLab AI service endpoint must use HTTPS.",
    );
  }

  return { endpoint: url.href, apiKey, model: env.ECONOMICLAB_AI_MODEL || "" };
}

async function prepareAiRequest(request, env) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 20000) {
    throw new PremiumOperationError(413, "request_too_large", "The AI request exceeds the allowed size.");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 20000) {
    throw new PremiumOperationError(413, "request_too_large", "The AI request exceeds the allowed size.");
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new PremiumOperationError(400, "invalid_request", "A valid JSON request body is required.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PremiumOperationError(400, "invalid_request", "A valid JSON request body is required.");
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 8000) {
    throw new PremiumOperationError(
      400,
      "invalid_prompt",
      "A prompt between 1 and 8,000 characters is required.",
    );
  }
  if (body.hasImages) {
    throw new PremiumOperationError(
      501,
      "image_analysis_unavailable",
      "Image analysis is not available yet. Remove attached images to send a text prompt.",
    );
  }

  return { ...providerConfiguration(env), prompt };
}

async function invokeAdapter({ endpoint, apiKey, model, prompt }) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prompt, ...(model ? { model } : {}) }),
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
  } catch {
    throw new PremiumOperationError(
      502,
      "ai_provider_unavailable",
      "The EconomicLab AI service is currently unavailable.",
    );
  }

  if (!response.ok) {
    throw new PremiumOperationError(
      502,
      "ai_provider_error",
      "The EconomicLab AI service could not complete the request.",
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new PremiumOperationError(
      502,
      "ai_provider_invalid_response",
      "The EconomicLab AI service returned an invalid response.",
    );
  }
  if (typeof result.text !== "string" || !result.text.trim()) {
    throw new PremiumOperationError(
      502,
      "ai_provider_invalid_response",
      "The EconomicLab AI service returned no response text.",
    );
  }
  if (result.text.length > 30000) {
    throw new PremiumOperationError(
      502,
      "ai_provider_invalid_response",
      "The EconomicLab AI service response exceeded the allowed size.",
    );
  }

  const citations = Array.isArray(result.citations)
    ? result.citations.flatMap((citation) => {
        if (!citation || typeof citation.title !== "string" || typeof citation.url !== "string") {
          return [];
        }
        try {
          const url = new URL(citation.url);
          return ["http:", "https:"].includes(url.protocol)
            ? [{ title: citation.title, url: url.href }]
            : [];
        } catch {
          return [];
        }
      })
    : [];
  return { text: result.text, citations };
}

export function createAiOperationHandler(overrides = {}) {
  const env = overrides.env ?? process.env;
  return createPremiumOperationHandler({
    permission: "ai",
    method: "POST",
    dailyLimit: 30,
    consumeUsage: overrides.consumeUsage ?? consumePremiumUsage,
    authenticate: overrides.authenticate,
    loadEntitlement: overrides.loadEntitlement,
    prepare: (request) => prepareAiRequest(request, env),
    execute: ({ prepared }) => (overrides.invokeAdapter ?? invokeAdapter)(prepared),
  });
}

export default createAiOperationHandler();

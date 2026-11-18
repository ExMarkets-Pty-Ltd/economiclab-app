import { createHash } from "node:crypto";

export function encodePayFastValue(value) {
  return encodeURIComponent(String(value ?? "").trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function payFastSignature(parameters, passphrase) {
  const entries = Object.entries(parameters)
    .filter(([key, value]) => key !== "signature" && value !== "" && value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  const encoded = entries
    .map(([key, value]) => `${encodePayFastValue(key)}=${encodePayFastValue(value)}`)
    .join("&");
  const signed = passphrase
    ? `${encoded}&passphrase=${encodePayFastValue(passphrase)}`
    : encoded;

  return createHash("md5").update(signed).digest("hex");
}

export function parseFormEncoded(rawBody) {
  const params = {};
  new URLSearchParams(rawBody).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-nf-client-connection-ip")
    || request.headers.get("cf-connecting-ip")
    || "";
}

export function isTrustedPayFastIp(ip, env = process.env) {
  const configured = env.PAYFAST_ALLOWED_IPS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = configured?.length
    ? configured
    : [
        "197.97.145.144",
        "197.97.145.145",
        "197.97.145.146",
        "197.97.145.147",
        "197.97.145.230",
        "197.97.145.231",
        "197.97.145.232",
      ];
  return allowed.includes(ip);
}

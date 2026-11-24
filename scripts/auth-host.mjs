// @ts-check

/**
 * Hosts the dev-server OAuth popup is willing to treat as its own origin.
 * `X-Forwarded-Host` is attacker-controlled unless an edge overwrites it, so a
 * value outside this list must not become the OAuth `redirect_uri`.
 * @param {string | undefined} header
 * @returns {string}
 */
export function hostnameFromHeader(header) {
  const raw = String(header ?? "").split(",")[0].trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end === -1 ? "" : raw.slice(1, end);
  }
  return raw.split(":")[0] ?? "";
}

/**
 * @param {string | undefined} header
 * @returns {boolean}
 */
export function isAllowedAuthHost(header) {
  const host = hostnameFromHeader(header);
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com")) return true;
  if (host === "grok.me" || host.endsWith(".grok.me")) return true;
  return false;
}

/**
 * @param {string | undefined} header
 * @returns {boolean}
 */
export function isAllowedForwardedProto(header) {
  const proto = String(header ?? "").split(",")[0].trim().toLowerCase();
  return proto === "http" || proto === "https";
}

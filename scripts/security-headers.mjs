// @ts-check

/** Published apps may be framed by Grok. Other responses stay unframed by policy. */
export const FRAME_ANCESTORS =
  "frame-ancestors 'self' https://grok.com https://*.grok.com";

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function isPublishedApp(env = process.env) {
  const project = String(env.GROK_PROJECT_ID ?? env.VITE_PROJECT_ID ?? "").trim();
  const host = String(env.VITE_PUBLIC_HOSTNAME ?? "").trim();
  return Boolean(project || host);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Record<string, string>}
 */
export function securityHeaders(env = process.env) {
  /** @type {Record<string, string>} */
  const headers = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  };
  if (isPublishedApp(env)) headers["content-security-policy"] = FRAME_ANCESTORS;
  return headers;
}

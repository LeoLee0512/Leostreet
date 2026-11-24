/**
 * Baseline response headers for the deployed app.
 * Framing is restricted only after publish (`GROK_PROJECT_ID` /
 * `VITE_PUBLIC_HOSTNAME`). The sandbox preview is embedded by a host that is
 * not this list, so it does not get `frame-ancestors`.
 */
import { securityHeaders } from "../../scripts/security-headers.mjs";

export default async function securityHeadersMiddleware(
  _event: unknown,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  for (const [key, value] of Object.entries(securityHeaders())) {
    headers.set(key, value);
  }
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}

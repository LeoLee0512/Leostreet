/**
 * Same-origin path for sign-in and sign-out redirects.
 * Anything else (other origins, protocol-relative URLs, backslashes) becomes `/`.
 */
export function safeAppPath(value: string | null | undefined): string {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/";
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return "/";
  try {
    const url = new URL(trimmed, "https://app.invalid");
    if (url.origin !== "https://app.invalid") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

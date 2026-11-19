/**
 * Cookie that opts a browser into the sandbox screens. It carries no identity
 * and unlocks no data: the sandbox pages have no server data at all. It is
 * short-lived and set by the `/try` page only.
 */
export const SANDBOX_COOKIE = "gl_sandbox";

export const SANDBOX_COOKIE_MAX_AGE_SECONDS = 60 * 30;

/** Paths of the real system screens the demo implements. */
const IMPLEMENTED = ["/branches", "/dresses"] as const;

/** Real system screens the demo does not implement; shown a friendly card. */
const UNIMPLEMENTED = [
  "/dashboard",
  "/employees",
  "/customers",
  "/reservations",
  "/payments",
  "/expenses",
  "/settings",
] as const;

function matchesPrefix(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Where the proxy should rewrite a sandbox visitor's request, if anywhere. */
export function resolveSandboxRewrite(pathname: string): string | null {
  if (IMPLEMENTED.some((base) => matchesPrefix(pathname, base))) {
    return `/sandbox/app${pathname}`;
  }
  if (UNIMPLEMENTED.some((base) => matchesPrefix(pathname, base))) {
    return "/sandbox/app/unavailable";
  }
  return null;
}

import { type NextRequest, NextResponse } from "next/server";
import {
  getUserSession,
  hasPermission,
  updateUserSessionExpiration,
} from "@/features/core/auth/core";
import { readScreenPermissionsCache } from "@/features/core/auth/core/screen-permission-cache";
import { PUBLIC_SITE_PATHS } from "@/features/public-catalog/lib/public-tabs";
import { getProtectedScreenDefinitionByPathname } from "@/features/system/registry";
import { env } from "./env/server";

/** Lets the system layout re-check the screen against the database. */
export const PATHNAME_HEADER = "x-pathname";

const authRoutes = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

const publicRoutes = ["/verify-email", "/oauth/", "/collection", "/view-dress"];

export async function proxy(request: NextRequest) {
  const response = (await middlewareAuth(request)) ?? NextResponse.next();

  await updateUserSessionExpiration(response.cookies);

  return response;
}

async function middlewareAuth(request: NextRequest) {
  const session = await getUserSession(request.cookies);
  const pathname = request.nextUrl.pathname;

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute =
    PUBLIC_SITE_PATHS.includes(
      pathname as (typeof PUBLIC_SITE_PATHS)[number],
    ) || publicRoutes.some((route) => pathname.startsWith(route));

  if (!session?.user) {
    if (isAuthRoute || isPublicRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  } else {
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    } else if (isPublicRoute) {
      return NextResponse.next();
    } else {
      const screen = getProtectedScreenDefinitionByPathname(pathname);

      // Only employees can carry per-user grants, so admins and customers skip
      // the extra Upstash round trip entirely.
      //
      // On a cache miss this falls back to role defaults for one request. That
      // is deliberate — the proxy is an optimistic check and must not lock
      // people out on a Redis blip — and it is backstopped by the layout gate in
      // (system-pages)/layout.tsx, which reads the database and also repairs the
      // mirror.
      const user =
        session.user.role === "employee"
          ? {
              ...session.user,
              screenPermissions: await readScreenPermissionsCache(
                session.user.id,
              ),
            }
          : session.user;

      if (
        !screen ||
        !hasPermission(user, "screens", "view", {
          screenKey: screen.key,
        })
      ) {
        return NextResponse.rewrite(new URL("/unauthorized", request.url));
      } else {
        const headers = new Headers(request.headers);
        headers.set(PATHNAME_HEADER, pathname);
        return NextResponse.next({ request: { headers } });
      }
    }
  }
}

export const config = {
  matcher: [
    "/((?!_next)(?!api)(?!unauthorized)(?!$)(?![^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

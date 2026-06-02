import { type NextRequest, NextResponse } from "next/server";
import {
  getUserSession,
  hasPermission,
  updateUserSessionExpiration,
} from "@/features/core/auth/core";
import { PUBLIC_SITE_PATHS } from "@/features/public-catalog/lib/public-tabs";
import { getProtectedScreenDefinitionByPathname } from "@/features/system/registry";
import { env } from "./env/server";

const authRoutes = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

const publicRoutes = [
  "/verify-email",
  "/oauth/",
  "/collection",
  "/view-dress",
  "/work/",
  "/blog/",
];

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
      if (
        !screen ||
        !hasPermission(session.user, "screens", "view", {
          screenKey: screen.key,
        })
      ) {
        return NextResponse.rewrite(new URL("/unauthorized", request.url));
      } else {
        return NextResponse.next();
      }
    }
  }
}

export const config = {
  matcher: [
    "/((?!_next)(?!api)(?!unauthorized)(?!$)(?![^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

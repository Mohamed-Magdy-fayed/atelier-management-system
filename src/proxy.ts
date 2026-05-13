import { type NextRequest, NextResponse } from "next/server";
import {
    getUserSession,
    hasPermission,
    updateUserSessionExpiration,
} from "@/features/core/auth/core";
import { getProtectedScreenDefinitionByPathname } from "@/features/system/registry";

const authRoutes = [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
];

const publicRoutes = [
    "/verify-email",
    "/oauth/",
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
    const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route),
    );

    if (!session?.user) {
        if (isAuthRoute) {
            return NextResponse.next();
        } else {
            return NextResponse.redirect(new URL("/sign-in", request.url));
        }
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

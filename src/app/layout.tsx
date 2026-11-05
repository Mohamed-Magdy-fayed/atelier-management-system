import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import { Suspense } from "react";

import { Providers } from "@/app/_providers";
import { getThemeCookie } from "@/features/core/color-theme/server";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import {
  buildBrandColorCss,
  resolveBrandName,
} from "@/features/system/settings/lib/branding";
import {
  getBranding,
  isDemoMode,
} from "@/features/system/settings/server/branding";
import { cn } from "@/lib/utils";

const openSans = Open_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const [locale, branding] = await Promise.all([
    getLocaleCookie(),
    getBranding(),
  ]);

  return {
    title: resolveBrandName(branding, locale, String(t("appName"))),
    description:
      "Browse curated evening wear, explore boutiques, check availability by date—reserve in person.",
    // A demo is a private link for one prospect, never a search result.
    ...(isDemoMode() && { robots: { index: false, follow: false } }),
    icons: {
      icon: [
        { url: "/logo.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense>
      <Suspended>{children}</Suspended>
    </Suspense>
  );
}

async function Suspended({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleCookie();
  const theme = await getThemeCookie();
  const brandColorCss = buildBrandColorCss((await getBranding()).primaryColor);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={cn(
        "antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
        openSans.variable,
        theme,
      )}
      suppressHydrationWarning
    >
      <body>
        {brandColorCss && (
          // Built only from a value that passed `isHexColor`, so it cannot
          // carry anything but colour tokens. Rendered after the global
          // stylesheet, so it wins over the bundled palette at equal specificity.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
          <style dangerouslySetInnerHTML={{ __html: brandColorCss }} />
        )}
        <Providers locale={locale} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

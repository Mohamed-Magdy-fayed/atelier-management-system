import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import { Suspense } from "react";

import { Providers } from "@/app/_providers";
import { getThemeCookie } from "@/features/core/color-theme/server";
import { getLocaleCookie } from "@/features/core/i18n/server";
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

export const metadata: Metadata = {
  title: "Funtastic",
  description:
    "Sell products, services, and bookings with a polished front door backed by a branch-aware business workspace.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

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
        <Providers locale={locale} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

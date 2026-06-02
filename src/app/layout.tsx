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
  title: {
    default:
      "Custom Software Development & Business Automation | Gateling Solutions",
    template: "%s | Gateling Solutions",
  },
  description:
    "We find the most painful points in your business and resolve them with custom software and AI. Serving cafes, schools, retail & events across Egypt and MENA.",
  metadataBase: new URL(process.env.BASE_URL ?? "https://gateling.com"),
  openGraph: {
    siteName: "Gateling Solutions",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://gateling.com/#org",
      name: "Gateling Solutions",
      url: "https://gateling.com",
      logo: "https://gateling.com/logo.png",
      email: "info@gateling.com",
    },
    {
      "@type": "WebSite",
      "@id": "https://gateling.com/#website",
      name: "Gateling Solutions",
      url: "https://gateling.com",
      publisher: { "@id": "https://gateling.com/#org" },
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers locale={locale} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

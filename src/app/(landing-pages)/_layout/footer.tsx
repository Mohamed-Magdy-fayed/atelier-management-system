import Link from "next/link";

import { getT } from "@/features/core/i18n/server";

export async function PublicFooter() {
  const { t } = await getT();
  const currentYear = new Date().getFullYear();

  const links = [
    { label: t("publicPages.footer.navServices"), href: "/services" },
    { label: t("publicPages.footer.navWork"), href: "/work" },
    { label: t("publicPages.footer.navBlog"), href: "/blog" },
    { label: t("publicPages.footer.navAbout"), href: "/about" },
    { label: t("publicPages.footer.navContact"), href: "/contact" },
    { label: t("publicPages.footer.navPrivacy"), href: "/privacy" },
    { label: t("publicPages.footer.navTerms"), href: "/terms" },
  ];

  return (
    <footer className="border-t bg-muted/30 py-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-semibold">
              <span className="text-primary">Gateling</span>{" "}
              <span>Solutions</span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("publicPages.footer.tagline")}
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="text-muted-foreground mt-8 text-center text-xs">
          © {currentYear} Gateling Solutions.
        </p>
      </div>
    </footer>
  );
}

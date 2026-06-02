import { PublicFooter } from "./_layout/footer";
import { PublicHeader } from "./_layout/header";
import { PublicLandingMobileTabBar } from "./_layout/mobile-tab-bar";
import { WhatsAppFloatButton } from "./_layout/whatsapp-float-button";

export default function LandingPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background md:h-auto md:min-h-screen md:overflow-visible">
      <PublicHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        {/* scrollable on mobile, natural on desktop */}
        <main className="min-h-0 flex-1 overflow-y-auto md:overflow-visible">
          {children}
          <PublicFooter />
        </main>
        <PublicLandingMobileTabBar />
      </div>
      <WhatsAppFloatButton />
    </div>
  );
}

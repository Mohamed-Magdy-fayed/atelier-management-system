import { El_Messiri, Tajawal } from "next/font/google";
import type { ReactNode } from "react";

import "@/features/marketing/marketing.css";

const display = El_Messiri({
  subsets: ["arabic", "latin"],
  variable: "--font-mk-display",
  weight: ["500", "700"],
});
const body = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-mk-body",
  weight: ["400", "500", "700"],
});

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`}>{children}</div>
  );
}

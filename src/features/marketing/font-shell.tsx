import { El_Messiri, Tajawal } from "next/font/google";
import type { ReactNode } from "react";

import "./marketing.css";

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

/** Shared by every marketing route so fonts and tokens load the same way. */
export function MarketingFontShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`}>{children}</div>
  );
}

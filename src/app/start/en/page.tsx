import {
  MarketingPage,
  marketingMetadata,
} from "@/features/marketing/page-factory";

export const metadata = marketingMetadata("en");

export default function Page() {
  return <MarketingPage locale="en" />;
}

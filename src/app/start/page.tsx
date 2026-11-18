import {
  MarketingPage,
  marketingMetadata,
} from "@/features/marketing/page-factory";

export const metadata = marketingMetadata("ar");

export default function Page() {
  return <MarketingPage locale="ar" />;
}

import { TestimonialsTablePage } from "@/features/system/testimonials/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default function TestimonialsPage() {
  return (
    <HydrateClient>
      <TestimonialsTablePage />
    </HydrateClient>
  );
}

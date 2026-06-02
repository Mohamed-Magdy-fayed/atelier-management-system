import type { Metadata } from "next";

import { FinalCtaSection } from "./_components/final-cta-section";
import { HeroSection } from "./_components/hero-section";
import { NewsletterSection } from "./_components/newsletter-section";
import { ProcessSection } from "./_components/process-section";
import { TestimonialsSection } from "./_components/testimonials-section";
import { ValuePropositionSection } from "./_components/value-proposition-section";
import { WorkPreviewSection } from "./_components/work-preview-section";

export const metadata: Metadata = {
  title:
    "Custom Software Development & Business Automation | Gateling Solutions",
  description:
    "We find the most painful points in your business and resolve them with custom software and AI. Serving cafes, schools, retail & events across Egypt and MENA.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ValuePropositionSection />
      <WorkPreviewSection />
      <TestimonialsSection />
      <ProcessSection />
      <NewsletterSection />
      <FinalCtaSection />
    </>
  );
}

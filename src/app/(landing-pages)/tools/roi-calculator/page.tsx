import type { Metadata } from "next";

import { RoiCalculator } from "./_components/roi-calculator";

export const metadata: Metadata = {
  title:
    "Business Automation ROI Calculator — How Much Is Manual Work Costing You?",
  description:
    "Calculate how much time and money your team loses to manual processes. See your potential savings with business automation. Free calculator.",
};

export default function RoiCalculatorPage() {
  return (
    <section className="py-20">
      <div className="container mx-auto max-w-3xl px-4 md:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">
            How Much Is Manual Work Costing Your Business?
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            Enter your team details below to see the annual cost of keeping
            things manual — and what 70% automation could save you.
          </p>
        </div>
        <RoiCalculator />
      </div>
    </section>
  );
}

import { seedScenario } from "../core";

export async function seedPerformanceProfile() {
  return seedScenario({ profile: "performance", seedPortfolioContent: true });
}

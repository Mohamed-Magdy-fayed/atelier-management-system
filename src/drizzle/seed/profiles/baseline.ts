import { seedScenario } from "../core";

export async function seedBaselineProfile() {
  return seedScenario({ profile: "baseline", seedPortfolioContent: false });
}

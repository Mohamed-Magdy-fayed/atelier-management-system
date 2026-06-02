import { seedScenario } from "../core";

export async function seedDemoProfile() {
  return seedScenario({ profile: "demo", seedPortfolioContent: true });
}

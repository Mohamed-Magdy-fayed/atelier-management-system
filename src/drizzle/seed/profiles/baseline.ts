import { seedScenario } from "../core";

export async function seedBaselineProfile() {
  return seedScenario({
    profile: "baseline",
    employeeCount: 6,
    customerCount: 24,
    customerInsertBatch: 24,
    dressCount: 8,
  });
}

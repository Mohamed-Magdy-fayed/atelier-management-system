import { seedScenario } from "../core";

export async function seedPerformanceProfile() {
  return seedScenario({
    profile: "performance",
    employeeCount: 60,
    customerCount: 8_000,
    customerInsertBatch: 500,
  });
}

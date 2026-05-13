import { seedScenario } from "../core";

export async function seedDemoProfile() {
  return seedScenario({
    profile: "demo",
    employeeCount: 18,
    customerCount: 180,
    customerInsertBatch: 90,
  });
}

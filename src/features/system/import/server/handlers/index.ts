import type { ImportEntitySlug } from "../../specs";
import { branchesImportHandler } from "./branches";
import { customersImportHandler } from "./customers";
import { dressesImportHandler } from "./dresses";
import { employeesImportHandler } from "./employees";
import type { ImportHandler } from "./types";

export * from "./types";

/** Entities with an implemented handler. Transactional ones land in phase 3. */
const HANDLERS: Partial<Record<ImportEntitySlug, ImportHandler>> = {
  branches: branchesImportHandler,
  employees: employeesImportHandler,
  customers: customersImportHandler,
  dresses: dressesImportHandler,
};

export function getImportHandler(
  slug: ImportEntitySlug,
): ImportHandler | undefined {
  return HANDLERS[slug];
}

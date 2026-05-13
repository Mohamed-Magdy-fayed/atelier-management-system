import type { LucideIcon } from "lucide-react";
import { Box, Building2, UserCircle, Users } from "lucide-react";

import type { ScreenKey } from "./screens";

type EntityNavTranslationKey =
  | "navCustomers"
  | "navEmployees"
  | "navBranches"
  | "navProducts";
type EntityBreadcrumbTranslationKey =
  | "breadcrumbCustomers"
  | "breadcrumbEmployees"
  | "breadcrumbBranches"
  | "breadcrumbProducts";
type EntityTitleKey =
  | "customersTitle"
  | "employeesTitle"
  | "branchesTitle"
  | "productsTitle";
type EntityLeadKey =
  | "customersLead"
  | "employeesLead"
  | "branchesLead"
  | "productsLead";

export type SystemEntityRegistryItem = {
  slug: string;
  route: `/${string}`;
  screenKey: ScreenKey;
  icon: LucideIcon;
  navLabelKey: EntityNavTranslationKey;
  breadcrumbLabelKey: EntityBreadcrumbTranslationKey;
  titleKey: EntityTitleKey;
  leadKey: EntityLeadKey;
  branchScope: "global" | "branch-aware" | "future-branch-aware";
  infoView: "audit-only";
  supportsImport: boolean;
  supportsExport: boolean;
  supportsRowSelection: boolean;
  supportsBulkActions: boolean;
  rowActions: readonly string[];
  bulkActions: readonly string[];
  showInDashboard: boolean;
  seedProfiles: readonly ("baseline" | "demo" | "performance")[];
};

export const SYSTEM_ENTITY_REGISTRY = [
  {
    slug: "customers",
    route: "/customers",
    screenKey: "customers",
    icon: UserCircle,
    navLabelKey: "navCustomers",
    breadcrumbLabelKey: "breadcrumbCustomers",
    titleKey: "customersTitle",
    leadKey: "customersLead",
    branchScope: "future-branch-aware",
    infoView: "audit-only",
    supportsImport: true,
    supportsExport: true,
    supportsRowSelection: true,
    supportsBulkActions: true,
    rowActions: ["info", "edit", "delete"],
    bulkActions: ["verify", "unverify", "delete"],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo", "performance"],
  },
  {
    slug: "employees",
    route: "/employees",
    screenKey: "employee",
    icon: Users,
    navLabelKey: "navEmployees",
    breadcrumbLabelKey: "breadcrumbEmployees",
    titleKey: "employeesTitle",
    leadKey: "employeesLead",
    branchScope: "future-branch-aware",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: true,
    supportsBulkActions: false,
    rowActions: ["info", "edit", "delete"],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo", "performance"],
  },
  {
    slug: "branches",
    route: "/branches",
    screenKey: "branches",
    icon: Building2,
    navLabelKey: "navBranches",
    breadcrumbLabelKey: "breadcrumbBranches",
    titleKey: "branchesTitle",
    leadKey: "branchesLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: false,
    supportsBulkActions: false,
    rowActions: ["info", "setActive", "edit", "delete"],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo", "performance"],
  },
  {
    slug: "products",
    route: "/products",
    screenKey: "products",
    icon: Box,
    navLabelKey: "navProducts",
    breadcrumbLabelKey: "breadcrumbProducts",
    titleKey: "productsTitle",
    leadKey: "productsLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: true,
    supportsExport: true,
    supportsRowSelection: true,
    supportsBulkActions: false,
    rowActions: ["info", "edit", "activate", "deactivate", "delete"],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo", "performance"],
  },
] as const satisfies readonly SystemEntityRegistryItem[];

export function getEntityRegistryItem(slug: string) {
  return SYSTEM_ENTITY_REGISTRY.find((entity) => entity.slug === slug);
}

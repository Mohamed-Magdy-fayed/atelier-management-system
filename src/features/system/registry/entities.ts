import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  CreditCard,
  Settings,
  Shirt,
  UserCircle,
  Users,
} from "lucide-react";

import type { ScreenKey } from "./screens";

type EntityNavTranslationKey =
  | "navCustomers"
  | "navEmployees"
  | "navBranches"
  | "navDresses"
  | "navReservations"
  | "navPayments"
  | "navSettings";
type EntityBreadcrumbTranslationKey =
  | "breadcrumbCustomers"
  | "breadcrumbEmployees"
  | "breadcrumbBranches"
  | "breadcrumbDresses"
  | "breadcrumbReservations"
  | "breadcrumbPayments"
  | "breadcrumbSettings";
type EntityTitleKey =
  | "customersTitle"
  | "employeesTitle"
  | "branchesTitle"
  | "dressesTitle"
  | "reservationsTitle"
  | "paymentsTitle"
  | "settingsTitle";
type EntityLeadKey =
  | "customersLead"
  | "employeesLead"
  | "branchesLead"
  | "dressesLead"
  | "reservationsLead"
  | "paymentsLead"
  | "settingsLead";

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
  filters: readonly string[];
  rowActions: readonly string[];
  bulkActions: readonly string[];
  showInDashboard: boolean;
  seedProfiles: readonly ("baseline" | "demo" | "performance")[];
};

export const SYSTEM_ENTITY_REGISTRY = [
  {
    slug: "customers",
    route: "/rental-customers",
    screenKey: "customers",
    icon: UserCircle,
    navLabelKey: "navCustomers",
    breadcrumbLabelKey: "breadcrumbCustomers",
    titleKey: "customersTitle",
    leadKey: "customersLead",
    branchScope: "branch-aware",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: true,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["createdAt"],
    rowActions: [],
    bulkActions: [],
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
    branchScope: "branch-aware",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: true,
    supportsBulkActions: false,
    filters: [],
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
    filters: [],
    rowActions: ["info", "setActive", "edit", "delete"],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo", "performance"],
  },
  {
    slug: "dresses",
    route: "/dresses",
    screenKey: "dresses",
    icon: Shirt,
    navLabelKey: "navDresses",
    breadcrumbLabelKey: "breadcrumbDresses",
    titleKey: "dressesTitle",
    leadKey: "dressesLead",
    branchScope: "branch-aware",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: true,
    supportsRowSelection: true,
    supportsBulkActions: true,
    filters: ["isActive", "pricePerDay", "createdAt"],
    rowActions: ["info", "edit", "activate", "deactivate", "delete"],
    bulkActions: ["activate", "deactivate", "archive"],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo", "performance"],
  },
  {
    slug: "reservations",
    route: "/reservations",
    screenKey: "reservations",
    icon: CalendarDays,
    navLabelKey: "navReservations",
    breadcrumbLabelKey: "breadcrumbReservations",
    titleKey: "reservationsTitle",
    leadKey: "reservationsLead",
    branchScope: "branch-aware",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: true,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: [
      "status",
      "dressId",
      "receivingDateTime",
      "occasionDate",
      "returnDateTime",
      "createdAt",
    ],
    rowActions: [
      "info",
      "receipt",
      "edit",
      "updateStatus",
      "collectPayment",
      "delete",
    ],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo"],
  },
  {
    slug: "payments",
    route: "/payments",
    screenKey: "payments",
    icon: CreditCard,
    navLabelKey: "navPayments",
    breadcrumbLabelKey: "breadcrumbPayments",
    titleKey: "paymentsTitle",
    leadKey: "paymentsLead",
    branchScope: "branch-aware",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: true,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["type", "method", "createdAt"],
    rowActions: ["info"],
    bulkActions: [],
    showInDashboard: false,
    seedProfiles: ["demo"],
  },
  {
    slug: "settings",
    route: "/settings",
    screenKey: "settings",
    icon: Settings,
    navLabelKey: "navSettings",
    breadcrumbLabelKey: "breadcrumbSettings",
    titleKey: "settingsTitle",
    leadKey: "settingsLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: [],
    rowActions: ["info", "edit"],
    bulkActions: [],
    showInDashboard: false,
    seedProfiles: ["baseline"],
  },
] as const satisfies readonly SystemEntityRegistryItem[];

export function getEntityRegistryItem(slug: string) {
  return SYSTEM_ENTITY_REGISTRY.find((entity) => entity.slug === slug);
}

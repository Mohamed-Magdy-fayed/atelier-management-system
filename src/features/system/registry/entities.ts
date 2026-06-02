import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  Settings,
  Star,
  Users,
} from "lucide-react";

import type { ScreenKey } from "./screens";

type EntityNavTranslationKey =
  | "navWork"
  | "navBlogPosts"
  | "navServices"
  | "navTestimonials"
  | "navLeads"
  | "navSubscribers"
  | "navUsers"
  | "navBranches"
  | "navSettings";

type EntityBreadcrumbTranslationKey =
  | "breadcrumbWork"
  | "breadcrumbBlogPosts"
  | "breadcrumbServices"
  | "breadcrumbTestimonials"
  | "breadcrumbLeads"
  | "breadcrumbSubscribers"
  | "breadcrumbUsers"
  | "breadcrumbBranches"
  | "breadcrumbSettings";

type EntityTitleKey =
  | "workTitle"
  | "blogPostsTitle"
  | "servicesTitle"
  | "testimonialsTitle"
  | "leadsTitle"
  | "subscribersTitle"
  | "usersTitle"
  | "branchesTitle"
  | "settingsTitle";

type EntityLeadKey =
  | "workLead"
  | "blogPostsLead"
  | "servicesLead"
  | "testimonialsLead"
  | "leadsLead"
  | "subscribersLead"
  | "usersLead"
  | "branchesLead"
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
    slug: "work",
    route: "/work-mgmt",
    screenKey: "work",
    icon: Briefcase,
    navLabelKey: "navWork",
    breadcrumbLabelKey: "breadcrumbWork",
    titleKey: "workTitle",
    leadKey: "workLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: true,
    supportsBulkActions: true,
    filters: ["status", "industry"],
    rowActions: ["info", "publish", "archive", "edit", "delete"],
    bulkActions: ["archive", "delete"],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo"],
  },
  {
    slug: "blog-posts",
    route: "/blog-posts",
    screenKey: "blogPosts",
    icon: FileText,
    navLabelKey: "navBlogPosts",
    breadcrumbLabelKey: "breadcrumbBlogPosts",
    titleKey: "blogPostsTitle",
    leadKey: "blogPostsLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: true,
    supportsBulkActions: true,
    filters: ["status"],
    rowActions: ["info", "publish", "archive", "edit", "delete"],
    bulkActions: ["archive", "delete"],
    showInDashboard: true,
    seedProfiles: ["baseline", "demo"],
  },
  {
    slug: "services",
    route: "/services-mgmt",
    screenKey: "services",
    icon: Inbox,
    navLabelKey: "navServices",
    breadcrumbLabelKey: "breadcrumbServices",
    titleKey: "servicesTitle",
    leadKey: "servicesLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["isActive"],
    rowActions: ["info", "activate", "deactivate", "edit", "delete"],
    bulkActions: [],
    showInDashboard: false,
    seedProfiles: ["baseline", "demo"],
  },
  {
    slug: "testimonials",
    route: "/testimonials",
    screenKey: "testimonials",
    icon: Star,
    navLabelKey: "navTestimonials",
    breadcrumbLabelKey: "breadcrumbTestimonials",
    titleKey: "testimonialsTitle",
    leadKey: "testimonialsLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["isVisible"],
    rowActions: ["info", "toggleVisibility", "edit", "delete"],
    bulkActions: [],
    showInDashboard: false,
    seedProfiles: ["baseline", "demo"],
  },
  {
    slug: "leads",
    route: "/leads",
    screenKey: "leads",
    icon: MessageSquare,
    navLabelKey: "navLeads",
    breadcrumbLabelKey: "breadcrumbLeads",
    titleKey: "leadsTitle",
    leadKey: "leadsLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: true,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["status", "source", "createdAt"],
    rowActions: ["info", "markContacted", "markQualified", "close", "delete"],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["demo"],
  },
  {
    slug: "subscribers",
    route: "/subscribers",
    screenKey: "subscribers",
    icon: Mail,
    navLabelKey: "navSubscribers",
    breadcrumbLabelKey: "breadcrumbSubscribers",
    titleKey: "subscribersTitle",
    leadKey: "subscribersLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: true,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["status"],
    rowActions: ["unsubscribe", "delete"],
    bulkActions: [],
    showInDashboard: true,
    seedProfiles: ["demo"],
  },
  {
    slug: "users",
    route: "/users",
    screenKey: "users",
    icon: Users,
    navLabelKey: "navUsers",
    breadcrumbLabelKey: "breadcrumbUsers",
    titleKey: "usersTitle",
    leadKey: "usersLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: ["role", "createdAt"],
    rowActions: ["info", "edit", "delete"],
    bulkActions: [],
    showInDashboard: false,
    seedProfiles: ["baseline"],
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
    showInDashboard: false,
    seedProfiles: ["baseline"],
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
  {
    slug: "blog",
    route: "/blog",
    screenKey: "blog",
    icon: BookOpen,
    navLabelKey: "navBlogPosts",
    breadcrumbLabelKey: "breadcrumbBlogPosts",
    titleKey: "blogPostsTitle",
    leadKey: "blogPostsLead",
    branchScope: "global",
    infoView: "audit-only",
    supportsImport: false,
    supportsExport: false,
    supportsRowSelection: false,
    supportsBulkActions: false,
    filters: [],
    rowActions: [],
    bulkActions: [],
    showInDashboard: false,
    seedProfiles: [],
  },
] as const satisfies readonly SystemEntityRegistryItem[];

export function getEntityRegistryItem(slug: string) {
  return SYSTEM_ENTITY_REGISTRY.find((entity) => entity.slug === slug);
}

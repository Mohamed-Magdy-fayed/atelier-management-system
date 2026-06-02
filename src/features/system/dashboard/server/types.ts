export type DashboardSummary = {
  newLeadsThisMonth: number;
  totalLeads: number;
  activeSubscribers: number;
  publishedCaseStudies: number;
  publishedBlogPosts: number;
  activeServices: number;
};

export type DashboardRecentLead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  recentLeads: DashboardRecentLead[];
};

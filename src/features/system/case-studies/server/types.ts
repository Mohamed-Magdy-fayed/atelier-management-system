import type { CaseStudy, CaseStudyResults } from "@/drizzle/schema";

export type CaseStudyRow = Pick<
  CaseStudy,
  | "id"
  | "title"
  | "slug"
  | "client"
  | "industry"
  | "status"
  | "publishedAt"
  | "sortOrder"
  | "coverImageUrl"
  | "liveUrl"
  | "createdAt"
  | "updatedAt"
> & { results: CaseStudyResults };

export type CaseStudyDetail = CaseStudy;

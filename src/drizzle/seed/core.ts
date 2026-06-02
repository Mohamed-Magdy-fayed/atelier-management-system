import { db } from "@/drizzle";
import {
  BlogPostsTable,
  BranchesTable,
  BranchMembershipsTable,
  CaseStudiesTable,
  type CaseStudyResults,
  ServicesTable,
  TestimonialsTable,
  UserCredentialsTable,
  UsersTable,
} from "@/drizzle/schema";
import { hashPassword } from "@/features/core/auth/core/passwordHasher";

import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
  type SeedProfileName,
} from "./constants";
import { seedDefaultSettings } from "./settings";

export type SeedScenarioConfig = {
  profile: SeedProfileName;
  seedPortfolioContent: boolean;
};

export type SeedScenarioResult = {
  adminUser: typeof UsersTable.$inferSelect;
  adminCredential: typeof UserCredentialsTable.$inferSelect;
  mainBranch: typeof BranchesTable.$inferSelect;
  profile: SeedProfileName;
};

export async function seedScenario(
  config: SeedScenarioConfig,
): Promise<SeedScenarioResult> {
  const { adminUser, adminCredential, mainBranch } = await db.transaction(
    async (tx) => {
      const adminUser = await tx
        .insert(UsersTable)
        .values({
          id: SEED_ADMIN_ID,
          createdBy: SEED_SYSTEM_ACTOR,
          email: SEED_ADMIN_EMAIL,
          emailVerifiedAt: new Date(),
          name: "Mohamed Magdy",
          role: "super_admin",
        })
        .returning()
        .then((data) => data[0]);

      const passwordHash = await hashPassword(
        SEED_ADMIN_PASSWORD,
        adminUser.id,
      );

      const adminCredential = await tx
        .insert(UserCredentialsTable)
        .values({
          userId: adminUser.id,
          passwordHash,
          passwordSalt: adminUser.id,
        })
        .returning()
        .then((data) => data[0]);

      const [mainBranch] = await tx
        .insert(BranchesTable)
        .values({
          shortCode: "MAIN",
          nameEn: "Main Branch",
          nameAr: "الفرع الرئيسي",
          ownerId: adminUser.id,
        })
        .returning();

      await tx.insert(BranchMembershipsTable).values({
        userId: adminUser.id,
        branchId: mainBranch.id,
        isCurrent: true,
      });

      if (config.seedPortfolioContent) {
        await seedPortfolioContent(tx, SEED_SYSTEM_ACTOR);
      }

      await seedDefaultSettings(tx, SEED_SYSTEM_ACTOR);

      return { adminUser, adminCredential, mainBranch };
    },
  );

  return {
    adminUser,
    adminCredential,
    mainBranch,
    profile: config.profile,
  };
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function seedPortfolioContent(
  tx: DbTx,
  createdBy: string,
): Promise<void> {
  await tx.insert(ServicesTable).values([
    {
      title: "Custom Software Development",
      slug: "custom-software-development",
      shortDescription:
        "Purpose-built business management systems designed around your exact workflows.",
      icon: "Code",
      features: [
        "Fully bilingual EN + AR",
        "Mobile-ready and responsive",
        "Role-based access control",
        "Real-time data and reporting",
      ],
      sortOrder: 0,
      isActive: true,
      createdBy,
    },
    {
      title: "Business Process Automation",
      slug: "business-process-automation",
      shortDescription:
        "Eliminate manual work, reduce errors, and cut operational costs.",
      icon: "Zap",
      features: [
        "Workflow mapping and optimization",
        "Automated notifications and alerts",
        "Document and receipt generation",
        "Background job processing",
      ],
      sortOrder: 1,
      isActive: true,
      createdBy,
    },
    {
      title: "AI Integration",
      slug: "ai-integration",
      shortDescription:
        "Bring intelligent automation into your daily operations.",
      icon: "Bot",
      features: [
        "AI-powered announcements (TTS)",
        "Smart scheduling and booking",
        "Data analysis and predictions",
        "Customer behavior insights",
      ],
      sortOrder: 2,
      isActive: true,
      createdBy,
    },
    {
      title: "Digital Transformation Consulting",
      slug: "digital-transformation-consulting",
      shortDescription:
        "Not sure where to start? We audit your processes and build a roadmap.",
      icon: "Map",
      features: [
        "Current state assessment",
        "Technology selection guidance",
        "Implementation roadmap",
        "Team training and handover",
      ],
      sortOrder: 3,
      isActive: true,
      createdBy,
    },
  ]);

  const atelierResults: CaseStudyResults = {
    metrics: [
      { label: "Admin time saved", value: "70%" },
      { label: "Double-bookings", value: "0" },
      { label: "Branches managed", value: "2+" },
    ],
    summary:
      "Zero double-bookings, real-time visibility across 2+ branches, and 70% reduction in admin time.",
  };

  const cafeResults: CaseStudyResults = {
    metrics: [
      { label: "Missed callouts", value: "0" },
      { label: "Daily cash reconciliation", value: "Automated" },
    ],
    summary:
      "Zero missed family callouts, automated TTS announcements, and full daily cash reconciliation.",
  };

  const megzResults: CaseStudyResults = {
    metrics: [
      { label: "Students digitized", value: "500+" },
      { label: "Lost leads", value: "0" },
      { label: "User roles", value: "7" },
    ],
    summary:
      "Complete lead-to-student pipeline digitized for 500+ students with full sales team accountability.",
  };

  const arabianResults: CaseStudyResults = {
    metrics: [
      { label: "Languages supported", value: "2" },
      { label: "In-house content updates", value: "Yes" },
    ],
    summary:
      "Distributors across the region now share one authoritative bilingual link when pitching products.",
  };

  const [atelier, cafe, megz, arabian] = await tx
    .insert(CaseStudiesTable)
    .values([
      {
        title: "Atelier Alaa El-Kasry: 70% Less Admin Time Across 2 Branches",
        slug: "atelier-alaa-el-kasry",
        client: "Atelier Alaa El-Kasry",
        industry: "Fashion / Retail",
        problemStatement:
          "Reservation conflicts, paper tracking across branches, no real-time inventory visibility.",
        solution:
          "Bilingual admin suite with branch-aware inventory, digital reservations, payment tracking, and WhatsApp receipt sharing.",
        results: atelierResults,
        status: "published",
        publishedAt: new Date(),
        sortOrder: 0,
        createdBy,
      },
      {
        title:
          "Lavida Jungle Play Cafe: Zero Missed Callouts With AI Announcements",
        slug: "lavida-jungle-play-cafe",
        client: "Lavida Jungle Play Cafe",
        industry: "Food & Beverage",
        problemStatement:
          "Kids area families missed because staff called names over music; reservations on paper; no daily cash accountability.",
        solution:
          "Reservation system + AI TTS announcer that auto-ducks background music. Daily cash closure reports per cashier.",
        results: cafeResults,
        status: "published",
        publishedAt: new Date(),
        sortOrder: 1,
        createdBy,
      },
      {
        title: "Megz Courses: Full Lead-to-Student Pipeline Digitized",
        slug: "megz-courses",
        client: "Megz Courses",
        industry: "Education",
        problemStatement:
          "Student enrollment via WhatsApp; invisible sales pipeline; teachers without digital materials.",
        solution:
          "Full CRM with lead pipeline, teacher portals, course materials, placement tests, multi-role access, orders and refunds.",
        results: megzResults,
        status: "published",
        publishedAt: new Date(),
        sortOrder: 2,
        createdBy,
      },
      {
        title:
          "Arabian Foods: Bilingual B2B Website for a MENA Food Distributor",
        slug: "arabian-foods",
        client: "Arabian Foods",
        industry: "Food & Beverage",
        problemStatement:
          "Distributors across the region relied on fragmented materials and had no single authoritative link to share with buyers.",
        solution:
          "Rebuilt arabianfoods.net as a fully bilingual (EN/AR) content-driven website the marketing team can update in-house without developer involvement.",
        results: arabianResults,
        status: "published",
        publishedAt: new Date(),
        sortOrder: 3,
        createdBy,
      },
    ])
    .returning({ id: CaseStudiesTable.id });

  await tx.insert(TestimonialsTable).values([
    {
      clientName: "Alaa El-Kasry",
      company: "Atelier Alaa El-Kasry",
      role: "Creative Director",
      content:
        "Gateling Solutions built a rental platform that tracks gowns, fittings, and deposits without a single spreadsheet. Stylists reserve pieces, clients pay online, and I get alerts before every pickup.",
      caseStudyId: atelier.id,
      isVisible: true,
      sortOrder: 0,
      createdBy,
    },
    {
      clientName: "Mohamed Hany",
      company: "Lavida Jungle Play Cafe",
      role: "Operations Manager",
      content:
        "Gateling Solutions delivered a cafe POS and reservation system that handles our orders, table bookings, and even plays automated announcements over our speakers. The QR menus and thermal receipt printing work seamlessly every shift.",
      caseStudyId: cafe.id,
      isVisible: true,
      sortOrder: 1,
      createdBy,
    },
    {
      clientName: "Eman Abd-Elrahman",
      company: "Eman Abd-Elrahman English Instructor Academy",
      role: "Lead English Instructor",
      content:
        "Gateling Solutions built a teaching management system that now handles enrolments, payments, and curriculum drops. Tutors see their dashboards and I launch new cohorts in minutes.",
      caseStudyId: megz.id,
      isVisible: true,
      sortOrder: 2,
      createdBy,
    },
    {
      clientName: "Hussein Farouk",
      company: "Arabian Foods",
      role: "Commercial Director",
      content:
        "Gateling Solutions rebuilt our website into a bilingual story we can update in-house. Distributors finally share one authoritative link when pitching our aged cheeses and private-label lines.",
      caseStudyId: arabian.id,
      isVisible: true,
      sortOrder: 3,
      createdBy,
    },
  ]);

  await tx.insert(BlogPostsTable).values([
    {
      title:
        "How to Automate Your Cafe Operations Without Losing the Human Touch",
      slug: "automate-cafe-operations",
      excerpt:
        "Most cafe owners think automation means losing the personal experience. Here's why the opposite is true.",
      content:
        "# How to Automate Your Cafe Operations\n\nManual processes in cafes cost more than you think...",
      authorName: "Gateling Solutions",
      tags: ["cafe", "automation", "operations"],
      status: "published",
      publishedAt: new Date(),
      createdBy,
    },
    {
      title: "Custom Software vs. Off-the-Shelf: Which One Actually Works?",
      slug: "custom-software-vs-off-the-shelf",
      excerpt:
        "Generic software forces your business to adapt to someone else's process. Here's when custom software pays for itself.",
      content:
        "# Custom Software vs. Off-the-Shelf\n\nEvery business owner faces this question eventually...",
      authorName: "Gateling Solutions",
      tags: ["custom software", "strategy"],
      status: "published",
      publishedAt: new Date(),
      createdBy,
    },
  ]);
}

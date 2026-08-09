import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { BranchesTable } from "@/drizzle/schemas/auth/branches-table";
import {
  createdAt,
  createdBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const importJobStatuses = [
  "uploaded",
  "validating",
  "review",
  "committing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type ImportJobStatus = (typeof importJobStatuses)[number];
export const importJobStatusEnum = pgEnum(
  "import_job_status",
  importJobStatuses,
);

/** Reserved for future ingests (a Google Sheet, say) without a schema change. */
export const importJobSources = ["csv"] as const;
export type ImportJobSource = (typeof importJobSources)[number];
export const importJobSourceEnum = pgEnum("import_job_source", importJobSources);

export const importRowStatuses = [
  "valid",
  "invalid",
  "done",
  "skipped",
] as const;
export type ImportRowStatus = (typeof importRowStatuses)[number];
export const importRowStatusEnum = pgEnum(
  "import_row_status",
  importRowStatuses,
);

export const importRowActions = ["create", "update", "skip"] as const;
export type ImportRowAction = (typeof importRowActions)[number];
export const importRowActionEnum = pgEnum(
  "import_row_action",
  importRowActions,
);

/**
 * A spreadsheet import in progress.
 *
 * The uploaded CSV is stored inline in `rawCsv` rather than in blob storage:
 * uploads are capped well under Vercel's 4.5 MB request-body limit, Postgres
 * TOASTs and compresses the text, and cleanup becomes a plain delete instead of
 * reconciling two systems. It is the source of truth for both passes — commit
 * re-parses and re-validates it rather than trusting the reviewed rows.
 *
 * `processedRows` is the server-owned cursor for the batch loop, which is what
 * makes a job resumable and makes a replayed batch request a no-op.
 */
export const ImportJobsTable = pgTable(
  "import_jobs",
  {
    id,
    entitySlug: varchar({ length: 64 }).notNull(),
    source: importJobSourceEnum().notNull().default("csv"),
    /** Default branch for branch-scoped rows that leave the branch column empty. */
    branchId: uuid().references(() => BranchesTable.id, {
      onDelete: "cascade",
    }),
    /** Locale the job was created in, so a resumed job reports consistently. */
    locale: varchar({ length: 8 }).notNull().default("en"),
    status: importJobStatusEnum().notNull().default("uploaded"),
    fileName: text().notNull(),
    rawCsv: text().notNull(),
    totalRows: integer().notNull().default(0),
    processedRows: integer().notNull().default(0),
    validRows: integer().notNull().default(0),
    invalidRows: integer().notNull().default(0),
    committedRows: integer().notNull().default(0),
    ignoredColumns: text().array(),
    errorMessage: text(),
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  },
  (table) => ({
    createdByIdx: index("import_jobs_created_by_idx").on(
      table.createdBy,
      table.createdAt,
    ),
    entityIdx: index("import_jobs_entity_slug_idx").on(table.entitySlug),
  }),
);

/** Per-row outcome, used for the review table and the error report. */
export const ImportJobRowsTable = pgTable(
  "import_job_rows",
  {
    id,
    jobId: uuid()
      .notNull()
      .references(() => ImportJobsTable.id, { onDelete: "cascade" }),
    rowNumber: integer().notNull(),
    status: importRowStatusEnum().notNull(),
    action: importRowActionEnum().notNull().default("skip"),
    /** Translated failure reasons; empty when the row is valid. */
    reasons: text().array().notNull().default([]),
    /** Normalized cell values, for display in the review table. */
    values: jsonb().notNull(),
    /** Existing record this row resolved to, when the action is update. */
    targetId: uuid(),
  },
  (table) => ({
    jobRowIdx: index("import_job_rows_job_id_row_number_idx").on(
      table.jobId,
      table.rowNumber,
    ),
    jobStatusIdx: index("import_job_rows_job_id_status_idx").on(
      table.jobId,
      table.status,
    ),
  }),
);

export const importJobsRelations = relations(
  ImportJobsTable,
  ({ one, many }) => ({
    branch: one(BranchesTable, {
      fields: [ImportJobsTable.branchId],
      references: [BranchesTable.id],
    }),
    rows: many(ImportJobRowsTable),
  }),
);

export const importJobRowsRelations = relations(
  ImportJobRowsTable,
  ({ one }) => ({
    job: one(ImportJobsTable, {
      fields: [ImportJobRowsTable.jobId],
      references: [ImportJobsTable.id],
    }),
  }),
);

export type ImportJob = typeof ImportJobsTable.$inferSelect;
export type NewImportJob = typeof ImportJobsTable.$inferInsert;
export type ImportJobRow = typeof ImportJobRowsTable.$inferSelect;
export type NewImportJobRow = typeof ImportJobRowsTable.$inferInsert;

import { z } from "zod";

import { IMPORT_ENTITY_SLUGS, MAX_IMPORT_FILE_BYTES } from "../specs";

export const importEntitySlugSchema = z.enum(IMPORT_ENTITY_SLUGS);

export const createImportJobInput = z.object({
  entitySlug: importEntitySlugSchema,
  branchId: z.uuid().nullish(),
  fileName: z.string().trim().min(1).max(255),
  /**
   * The CSV text itself. Vercel caps serverless request bodies at 4.5 MB and
   * that applies to the tRPC route, so this is the last line of defence behind
   * the browser-side guard.
   */
  content: z.string().min(1).max(MAX_IMPORT_FILE_BYTES),
});

export const importJobIdInput = z.object({ jobId: z.uuid() });

/**
 * `cursor` is what the client believes has been processed. The server compares
 * it against the stored `processedRows` and rejects a mismatch, so a replayed
 * or double-submitted batch is a no-op instead of a double insert.
 */
export const importBatchInput = z.object({
  jobId: z.uuid(),
  cursor: z.number().int().min(0),
});

export const listImportJobRowsInput = z.object({
  jobId: z.uuid(),
  filter: z.enum(["all", "valid", "invalid", "done"]).default("all"),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(200).default(50),
});

export const listImportJobsInput = z.object({
  entitySlug: importEntitySlugSchema.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type CreateImportJobInput = z.infer<typeof createImportJobInput>;
export type ImportBatchInput = z.infer<typeof importBatchInput>;
export type ImportJobIdInput = z.infer<typeof importJobIdInput>;
export type ListImportJobRowsInput = z.infer<typeof listImportJobRowsInput>;
export type ListImportJobsInput = z.infer<typeof listImportJobsInput>;

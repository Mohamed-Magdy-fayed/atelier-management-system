import type { ImportRowAction } from "@/drizzle/schema";

import type { ImportEntitySpec } from "../../specs";
import type { ProtectedTRPCSession, TRPCContext } from "../shared";

export type ImportReason = {
  reasonKey: string;
  params?: Record<string, string | number>;
};

/** One parsed row, before existence checks. */
export type PreparedRow = {
  rowNumber: number;
  /** Normalized column values, shown in the review table. */
  values: Record<string, unknown>;
  /** Natural-key string used for in-file duplicate detection and matching. */
  naturalKey: string | null;
  reasons: ImportReason[];
};

/** A row after matching against existing records. */
export type ResolvedRow = PreparedRow & {
  action: ImportRowAction;
  targetId: string | null;
};

/**
 * A Drizzle transaction handle. Commit runs inside one; validation runs on the
 * plain connection, so handlers take the runner rather than reaching for
 * `ctx.db` and being locked to the non-transactional type.
 */
type ImportTransaction = Parameters<
  Parameters<TRPCContext["db"]["transaction"]>[0]
>[0];

export type ImportDb = TRPCContext["db"] | ImportTransaction;

export type BatchContext = {
  ctx: TRPCContext;
  /** Query runner: the connection during validation, the transaction on commit. */
  db: ImportDb;
  session: ProtectedTRPCSession;
  spec: ImportEntitySpec;
  /** Job-level fallback branch for branch-scoped entities. */
  branchId: string | null;
};

/**
 * Per-entity import behaviour.
 *
 * `prepare` runs on every batch of both passes: validation shows the result,
 * commit re-runs it so a stale review can never write. Reference and existence
 * lookups are batch-wide (one query per column) rather than per row.
 */
export type ImportHandler = {
  /** Parse and validate a batch, then decide create/update/skip per row. */
  prepare: (
    batch: BatchContext,
    rows: { rowNumber: number; cells: Record<string, string> }[],
  ) => Promise<ResolvedRow[]>;

  /** Write the rows that survived preparation. Runs inside a transaction. */
  commit: (batch: BatchContext, rows: ResolvedRow[]) => Promise<void>;
};

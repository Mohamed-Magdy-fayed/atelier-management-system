"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useTRPC } from "@/integrations/trpc/client";

import type { ImportEntitySlug } from "../specs";

export type ImportStep =
  | "guide"
  | "validating"
  | "review"
  | "committing"
  | "done";

export type ImportProgress = {
  processed: number;
  total: number;
};

/**
 * Drives an import job from the browser.
 *
 * There is no queue in this stack, so the batch loop *is* the worker: each call
 * handles one batch and returns the server's new cursor, and we call again
 * until it reports done. Every request stays short, so nothing approaches the
 * serverless timeout, and progress comes straight from the loop rather than
 * from polling.
 *
 * The cursor is always the value the server just returned, never a locally
 * incremented one — the server rejects a mismatch, which is what makes a
 * retried or double-submitted batch a no-op instead of a double insert.
 */
export function useImportJob(entitySlug: ImportEntitySlug) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [jobId, setJobId] = useState<string | null>(null);
  const [step, setStep] = useState<ImportStep>("guide");
  const [progress, setProgress] = useState<ImportProgress>({
    processed: 0,
    total: 0,
  });
  const [counts, setCounts] = useState({
    valid: 0,
    invalid: 0,
    committed: 0,
  });
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createJob = useMutation(trpc.import.createJob.mutationOptions());
  const validateBatch = useMutation(
    trpc.import.validateBatch.mutationOptions(),
  );
  const startCommit = useMutation(trpc.import.startCommit.mutationOptions());
  const commitBatch = useMutation(trpc.import.commitBatch.mutationOptions());
  const cancelJob = useMutation(trpc.import.cancelJob.mutationOptions());

  const reset = useCallback(() => {
    setJobId(null);
    setStep("guide");
    setProgress({ processed: 0, total: 0 });
    setCounts({ valid: 0, invalid: 0, committed: 0 });
    setIgnoredColumns([]);
    setError(null);
  }, []);

  const runValidation = useCallback(
    async (id: string, startCursor: number) => {
      let cursor = startCursor;

      for (;;) {
        const result = await validateBatch.mutateAsync({
          jobId: id,
          cursor,
        });

        cursor = result.processedRows;
        setProgress({
          processed: result.processedRows,
          total: result.totalRows,
        });
        setCounts((current) => ({
          ...current,
          valid: result.validRows,
          invalid: result.invalidRows,
        }));

        if (result.done) break;
      }

      setStep("review");
    },
    [validateBatch],
  );

  const start = useCallback(
    async (args: {
      fileName: string;
      content: string;
      branchId: string | null;
    }) => {
      setError(null);
      setStep("validating");

      try {
        const job = await createJob.mutateAsync({
          entitySlug,
          fileName: args.fileName,
          content: args.content,
          branchId: args.branchId,
        });

        setJobId(job.id);
        setIgnoredColumns(job.ignoredColumns ?? []);
        setProgress({ processed: 0, total: job.totalRows });

        await runValidation(job.id, 0);
      } catch (cause) {
        setStep("guide");
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [createJob, entitySlug, runValidation],
  );

  const commit = useCallback(async () => {
    if (!jobId) return;

    setError(null);
    setStep("committing");

    try {
      await startCommit.mutateAsync({ jobId });

      let cursor = 0;
      for (;;) {
        const result = await commitBatch.mutateAsync({ jobId, cursor });

        cursor = result.processedRows;
        setProgress({
          processed: result.processedRows,
          total: result.totalRows,
        });
        setCounts((current) => ({
          ...current,
          committed: result.committedRows,
        }));

        if (result.done) break;
      }

      setStep("done");
      // The grid behind the dialog is now stale in every case.
      await queryClient.invalidateQueries();
    } catch (cause) {
      setStep("review");
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [commitBatch, jobId, queryClient, startCommit]);

  /**
   * Rejoins a job left in flight — the dialog was closed or the page reloaded
   * mid-run. State lives in Postgres, so the loop simply picks up from the
   * server's cursor.
   */
  const resume = useCallback(
    async (job: {
      id: string;
      status: string;
      processedRows: number;
      totalRows: number;
      validRows: number;
      invalidRows: number;
      committedRows: number;
      ignoredColumns: string[] | null;
    }) => {
      setJobId(job.id);
      setIgnoredColumns(job.ignoredColumns ?? []);
      setProgress({ processed: job.processedRows, total: job.totalRows });
      setCounts({
        valid: job.validRows,
        invalid: job.invalidRows,
        committed: job.committedRows,
      });

      if (job.status === "validating") {
        setStep("validating");
        await runValidation(job.id, job.processedRows);
        return;
      }

      if (job.status === "review") {
        setStep("review");
        return;
      }

      if (job.status === "completed") {
        setStep("done");
        return;
      }

      setStep("guide");
    },
    [runValidation],
  );

  const cancel = useCallback(async () => {
    if (jobId) {
      await cancelJob.mutateAsync({ jobId }).catch(() => {
        // Cancelling is best-effort; the job ages out regardless.
      });
    }
    reset();
  }, [cancelJob, jobId, reset]);

  return {
    jobId,
    step,
    progress,
    counts,
    ignoredColumns,
    error,
    start,
    commit,
    resume,
    cancel,
    reset,
    isBusy: step === "validating" || step === "committing",
  };
}

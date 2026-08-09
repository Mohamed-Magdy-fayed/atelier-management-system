"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  Loader2Icon,
  RefreshCcwIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/features/core/i18n/client";
import { useBranchFieldOptions } from "@/features/system/shared/use-branch-field-options";
import { useTRPC } from "@/integrations/trpc/client";
import type { ImportEntitySlug } from "../../specs";
import { getImportSpec, MAX_IMPORT_FILE_BYTES } from "../../specs";
import { useImportJob } from "../use-import-job";
import { ImportColumnGuide } from "./import-column-guide";
import { ImportReviewTable } from "./import-review-table";

const MAX_MB = Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024));

export function ImportDialog({
  entitySlug,
  trigger,
}: {
  entitySlug: ImportEntitySlug;
  trigger: ReactElement;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const spec = getImportSpec(entitySlug);
  const { options: branchOptions, defaultBranchId } = useBranchFieldOptions();
  const [branchId, setBranchId] = useState<string>(defaultBranchId);

  const job = useImportJob(entitySlug);

  // A job left mid-run keeps its state in Postgres, so reopening the dialog
  // rejoins it instead of forcing the admin to start over.
  const inFlightQuery = useQuery({
    ...trpc.import.listJobs.queryOptions({ entitySlug, limit: 1 }),
    enabled: open && job.step === "guide" && !job.jobId,
  });

  useEffect(() => {
    const latest = inFlightQuery.data?.jobs?.[0];
    if (!latest) return;
    if (latest.status !== "validating" && latest.status !== "review") return;
    if (job.jobId) return;

    setFileName(latest.fileName);
    void job.resume(latest);
  }, [inFlightQuery.data, job]);

  function closeDialog(next: boolean) {
    // Never abandon a run mid-write; the loop owns the cursor until it finishes.
    if (!next && job.step === "committing") return;

    setOpen(next);

    if (!next) {
      job.reset();
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("systemPages.importNotCsv"));
      return;
    }

    // Guarded here rather than at the API: Vercel rejects an oversized body
    // with a bare 413 that says nothing useful to the person uploading.
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      toast.error(t("systemPages.importFileTooLarge", { max: String(MAX_MB) }));
      return;
    }

    setFileName(file.name);

    await job.start({
      fileName: file.name,
      content: await file.text(),
      branchId: spec?.branchScoped ? branchId || null : null,
    });
  }

  if (!spec) return null;

  const percent =
    job.progress.total > 0
      ? Math.round((job.progress.processed / job.progress.total) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger render={trigger} />

      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>
            {t("systemPages.importTitle", { entity: t(spec.titleKey, {}) })}
          </DialogTitle>
          <DialogDescription>
            {t("systemPages.importDescription")}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-4 px-4 py-4">
            {job.error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("systemPages.importFailedTitle")}</AlertTitle>
                <AlertDescription>{job.error}</AlertDescription>
              </Alert>
            ) : null}

            {job.step === "guide" ? (
              <>
                {spec.branchScoped ? (
                  <Field>
                    <FieldLabel htmlFor="import-branch">
                      {t("systemPages.importBranchLabel")}
                    </FieldLabel>
                    <Select
                      value={branchId || null}
                      onValueChange={(value) =>
                        setBranchId((value as string) ?? "")
                      }
                    >
                      <SelectTrigger id="import-branch" className="w-full">
                        <SelectValue
                          placeholder={t("systemPages.formBranchPlaceholder")}
                        >
                          {(value) =>
                            branchOptions.find(
                              (option) => option.value === (value as string),
                            )?.label ?? t("systemPages.formBranchPlaceholder")
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {branchOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("systemPages.importBranchHint")}
                    </FieldDescription>
                  </Field>
                ) : null}

                <ImportColumnGuide spec={spec} />

                <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="truncate text-sm">
                    {fileName ?? t("systemPages.importChooseFile")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="self-start sm:self-auto"
                  >
                    {fileName ? (
                      <RefreshCcwIcon data-icon="inline-start" />
                    ) : (
                      <UploadIcon data-icon="inline-start" />
                    )}
                    {fileName
                      ? t("systemPages.importReplaceFile")
                      : t("systemPages.importChooseFile")}
                  </Button>
                </div>
              </>
            ) : null}

            {job.isBusy ? (
              <div className="flex flex-col gap-2 rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2Icon className="size-4 animate-spin" />
                  {job.step === "validating"
                    ? t("systemPages.importValidating")
                    : t("systemPages.importCommitting")}
                </div>
                <Progress value={percent} />
                <span className="text-muted-foreground text-xs">
                  {t("systemPages.importProgress", {
                    processed: String(job.progress.processed),
                    total: String(job.progress.total),
                  })}
                </span>
              </div>
            ) : null}

            {job.ignoredColumns.length > 0 && job.step !== "guide" ? (
              <p className="text-muted-foreground text-xs">
                {t("systemPages.importIgnoredColumns")}{" "}
                {job.ignoredColumns.join(", ")}
              </p>
            ) : null}

            {job.step === "review" && job.jobId ? (
              <ImportReviewTable
                jobId={job.jobId}
                spec={spec}
                counts={job.counts}
              />
            ) : null}

            {job.step === "done" ? (
              <Alert>
                <CheckIcon />
                <AlertTitle>{t("systemPages.importDoneTitle")}</AlertTitle>
                <AlertDescription>
                  {t("systemPages.importDoneSummary", {
                    committed: String(job.counts.committed),
                    invalid: String(job.counts.invalid),
                  })}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-4 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={job.step === "committing"}
            onClick={() => closeDialog(false)}
          >
            <XIcon data-icon="inline-start" />
            {job.step === "done" ? t("common.close") : t("common.cancel")}
          </Button>

          {job.step === "review" ? (
            <Button
              type="button"
              disabled={job.counts.valid === 0}
              onClick={() => void job.commit()}
            >
              <CheckIcon data-icon="inline-start" />
              {job.counts.valid === 0
                ? t("systemPages.importNothingToApply")
                : t("systemPages.importApply", {
                    count: String(job.counts.valid),
                  })}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

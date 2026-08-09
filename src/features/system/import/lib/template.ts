"use client";

import { downloadCsv, rowsToCsv } from "@/features/core/data-table";

import type { ImportEntitySpec } from "../specs";

/**
 * Builds the import template: canonical headers and nothing else.
 *
 * No required-vs-optional markers and no sample row — a marker in the header
 * would have to be stripped on upload, and a sample row would have to be
 * detected and skipped. Both belong in the column guide in the dialog, where
 * they can be shown properly (badges, types, accepted values) and cannot
 * contaminate the data the admin pastes in.
 */
export function buildTemplateCsv(spec: ImportEntitySpec): string {
  return rowsToCsv(
    spec.columns.map((column) => column.key),
    [],
  );
}

export function downloadTemplate(spec: ImportEntitySpec) {
  downloadCsv(`${spec.slug}-import-template.csv`, buildTemplateCsv(spec));
}

/** Required columns first, so the guide leads with what the admin must supply. */
export function sortColumnsForGuide(spec: ImportEntitySpec) {
  return [...spec.columns].sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return 0;
  });
}

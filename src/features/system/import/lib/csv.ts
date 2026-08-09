/**
 * CSV parsing for imports.
 *
 * Deliberately separate from `features/core/data-table/lib/csv.ts`: that parser
 * splits the text on newlines before handling quotes, so a quoted cell holding a
 * line break (a customer note pasted out of an old system, say) silently splits
 * into two malformed rows. It also caps at 256 KB. Imports need neither
 * limitation, so this is a single-pass state machine over the whole text.
 */

const UTF8_BOM = "﻿";

export type ParsedCsv = {
  headers: string[];
  /** One entry per data row, cells in header order. */
  rows: string[][];
};

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text;
}

/** Splits CSV text into records, honouring quotes across line breaks. */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let inQuotes = false;
  let cellWasQuoted = false;
  const source = stripBom(text);

  const endCell = () => {
    record.push(cellWasQuoted ? cell : cell.trim());
    cell = "";
    cellWasQuoted = false;
  };

  const endRecord = () => {
    endCell();
    // A trailing newline yields one empty cell — that is not a row.
    if (record.length > 1 || record[0] !== "") records.push(record);
    record = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      cellWasQuoted = true;
    } else if (char === ",") {
      endCell();
    } else if (char === "\n") {
      endRecord();
    } else if (char === "\r") {
      // CRLF: the \n that follows drives the record break.
      if (source[i + 1] !== "\n") endRecord();
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || record.length > 0) endRecord();

  return records;
}

/**
 * Parses an import file into a header row plus data rows, dropping rows that
 * are entirely empty (trailing blank lines are common in pasted exports).
 */
export function parseImportCsv(text: string): ParsedCsv | null {
  const records = parseCsvRecords(text);
  const headers = records[0];

  if (!headers || headers.every((header) => header.trim().length === 0)) {
    return null;
  }

  const rows = records
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0));

  return { headers, rows };
}

/** Cells keyed by header, for rows a spec has not yet been matched against. */
export function toKeyedRow(
  headers: string[],
  cells: string[],
): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    row[header] = cells[index] ?? "";
  });
  return row;
}

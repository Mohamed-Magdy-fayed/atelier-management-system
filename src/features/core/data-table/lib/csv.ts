const MAX_IMPORT_BYTES = 256 * 1024;

/** Excel opens CSV with the system ANSI codepage unless the file starts with a BOM. */
const UTF8_BOM = "﻿";

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD HH:mm` in local time — parsed as a date by Excel/Sheets. */
export function formatCsvDateTime(value: Date | string | number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatCsvDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `YYYY-MM-DD` in local time. */
export function formatCsvDate(value: Date | string | number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? formatCsvDateTime(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function rowsToCsv(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([UTF8_BOM, csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsvToObjects(
  text: string,
): { headers: string[]; rows: Record<string, unknown>[] } | null {
  if (text.length > MAX_IMPORT_BYTES) return null;
  const lines = stripBom(text)
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const first = lines[0];
  if (first === undefined) return null;
  const headers = parseCsvLine(first);
  const rows: Record<string, unknown>[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (line === undefined) continue;
    const cells = parseCsvLine(line);
    const o: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      o[h] = cells[i] ?? "";
    });
    rows.push(o);
  }
  return { headers, rows };
}

export function parseCsvPreview(
  text: string,
  maxRows = 8,
): { headers: string[]; rows: string[][] } | null {
  if (text.length > MAX_IMPORT_BYTES) return null;
  const lines = stripBom(text)
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const first = lines[0];
  if (first === undefined) return null;
  const headers = parseCsvLine(first);
  const rows = lines.slice(1, 1 + maxRows).map(parseCsvLine);
  return { headers, rows };
}

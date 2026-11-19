import type { BranchGridRow } from "@/features/system/branches/server/types";
import type { DressGridRow } from "@/features/system/dresses/server/types";

import {
  getSandboxState,
  SANDBOX_OWNER,
  type SandboxBranch,
  type SandboxDress,
  type SandboxDressStatus,
  updateSandboxState,
} from "./state";

/**
 * The procedures the sandbox answers. Anything else is rejected with a clear
 * message instead of pretending to work, so a screen outside the tour fails
 * loudly in development rather than showing made-up data.
 */

type Sorting = Array<{ id: string; desc: boolean }>;

type ListInput = {
  page?: number;
  perPage?: number;
  sorting?: Sorting;
  globalFilter?: string;
  branchId?: string;
};

function asObject(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function emptyToNull(value: unknown): string | null {
  const text = str(value)?.trim();
  return text ? text : null;
}

function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  sorting: Sorting | undefined,
): T[] {
  const first = sorting?.[0];
  if (!first) return rows;
  const direction = first.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[first.id];
    const right = b[first.id];
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }
    return String(left ?? "").localeCompare(String(right ?? "")) * direction;
  });
}

function paginate<T>(rows: T[], input: ListInput) {
  const perPage = Math.max(1, input.perPage ?? 20);
  const page = Math.max(1, input.page ?? 1);
  return {
    rows: rows.slice((page - 1) * perPage, page * perPage),
    total: rows.length,
    pageCount: Math.max(1, Math.ceil(rows.length / perPage)),
  };
}

function matches(haystack: Array<string | null>, query: string | undefined) {
  const needle = query?.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((value) => value?.toLowerCase().includes(needle));
}

function toBranchRow(branch: SandboxBranch): BranchGridRow {
  return {
    id: branch.id,
    shortCode: branch.shortCode,
    nameEn: branch.nameEn,
    nameAr: branch.nameAr,
    addressEn: branch.addressEn,
    addressAr: branch.addressAr,
    phone: branch.phone,
    opensAt: branch.opensAt,
    closesAt: branch.closesAt,
    mapUrl: branch.mapUrl,
    ownerId: SANDBOX_OWNER.id,
    ownerName: SANDBOX_OWNER.name,
    memberCount: 1,
    createdAt: new Date(branch.createdAt),
    updatedAt: new Date(branch.createdAt),
  };
}

function toDressRow(dress: SandboxDress): DressGridRow {
  return {
    id: dress.id,
    branchId: dress.branchId,
    code: dress.code,
    title: dress.title,
    description: dress.description,
    images: dress.images,
    size: dress.size,
    color: dress.color,
    pricePerDay: dress.pricePerDay,
    depositAmount: dress.depositAmount,
    insurance: dress.insurance,
    timesRented: dress.timesRented,
    lastReservedAt: null,
    netValue: dress.timesRented * dress.pricePerDay,
    isActive: dress.isActive,
    currentStatus: dress.currentStatus,
    createdAt: new Date(dress.createdAt),
    createdBy: SANDBOX_OWNER.id,
    updatedAt: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
  };
}

function branchesList(rawInput: unknown) {
  const input = asObject(rawInput) as ListInput;
  const filtered = getSandboxState().branches.filter((branch) =>
    matches(
      [
        branch.shortCode,
        branch.nameEn,
        branch.nameAr,
        branch.phone,
        branch.addressEn,
        branch.addressAr,
      ],
      input.globalFilter,
    ),
  );
  const rows = sortRows(filtered.map(toBranchRow), input.sorting);
  return paginate(rows, input);
}

function branchFields(input: Record<string, unknown>) {
  return {
    shortCode: (str(input.shortCode) ?? "").toUpperCase(),
    nameEn: str(input.nameEn) ?? "",
    nameAr: str(input.nameAr) ?? "",
    addressEn: emptyToNull(input.addressEn),
    addressAr: emptyToNull(input.addressAr),
    phone: emptyToNull(input.phone),
    opensAt: emptyToNull(input.opensAt),
    closesAt: emptyToNull(input.closesAt),
    mapUrl: emptyToNull(input.mapUrl),
  };
}

function branchesCreate(rawInput: unknown) {
  const fields = branchFields(asObject(rawInput));
  const state = getSandboxState();
  if (state.branches.some((branch) => branch.shortCode === fields.shortCode)) {
    throw new Error("A branch with this short code already exists");
  }
  const created: SandboxBranch = {
    id: crypto.randomUUID(),
    ...fields,
    createdAt: new Date().toISOString(),
    userCreated: true,
  };
  updateSandboxState((draft) => ({
    ...draft,
    branches: [...draft.branches, created],
  }));
  return { id: created.id };
}

function branchesUpdate(rawInput: unknown) {
  const input = asObject(rawInput);
  const id = str(input.id);
  const fields = branchFields(input);
  updateSandboxState((draft) => ({
    ...draft,
    branches: draft.branches.map((branch) =>
      branch.id === id ? { ...branch, ...fields } : branch,
    ),
  }));
  return { id };
}

function branchesDelete(rawInput: unknown) {
  const id = str(asObject(rawInput).id);
  updateSandboxState((draft) => ({
    ...draft,
    branches: draft.branches.filter((branch) => branch.id !== id),
    dresses: draft.dresses.filter((dress) => dress.branchId !== id),
  }));
  return { id };
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function dressesList(rawInput: unknown) {
  const input = asObject(rawInput) as ListInput;
  const scoped = getSandboxState().dresses.filter(
    (dress) => !input.branchId || dress.branchId === input.branchId,
  );
  const filtered = scoped.filter((dress) =>
    matches(
      [dress.code, dress.title, dress.color, dress.size],
      input.globalFilter,
    ),
  );
  const rows = sortRows(filtered.map(toDressRow), input.sorting);
  return {
    ...paginate(rows, input),
    facets: {
      isActive: countBy(scoped.map((dress) => String(dress.isActive))),
      currentStatus: countBy(scoped.map((dress) => dress.currentStatus)),
    },
  };
}

function dressesFilterOptions(rawInput: unknown) {
  const branchId = str(asObject(rawInput).branchId);
  const { dresses, branches } = getSandboxState();
  return dresses
    .filter((dress) => !branchId || dress.branchId === branchId)
    .map((dress) => {
      const branch = branches.find((item) => item.id === dress.branchId);
      return {
        id: dress.id,
        code: dress.code,
        title: dress.title,
        isActive: dress.isActive,
        branchNameEn: branch?.nameEn ?? "",
        branchNameAr: branch?.nameAr ?? "",
      };
    });
}

function dressFields(input: Record<string, unknown>) {
  const images = Array.isArray(input.images)
    ? input.images.filter((item): item is string => typeof item === "string")
    : [];
  return {
    branchId: str(input.branchId) ?? "",
    code: str(input.code) ?? "",
    title: str(input.title) ?? "",
    description: emptyToNull(input.description),
    images: images.length > 0 ? images : null,
    size: emptyToNull(input.size),
    color: emptyToNull(input.color),
    pricePerDay: num(input.pricePerDay),
    depositAmount: num(input.depositAmount),
    insurance: num(input.insurance),
    isActive: input.isActive !== false,
  };
}

function dressesCreate(rawInput: unknown) {
  const fields = dressFields(asObject(rawInput));
  const state = getSandboxState();
  if (state.dresses.some((dress) => dress.code === fields.code)) {
    throw new Error("A dress with this code already exists");
  }
  const created: SandboxDress = {
    id: crypto.randomUUID(),
    ...fields,
    timesRented: 0,
    currentStatus: "available",
    createdAt: new Date().toISOString(),
    userCreated: true,
  };
  updateSandboxState((draft) => ({
    ...draft,
    dresses: [created, ...draft.dresses],
  }));
  return { id: created.id };
}

function dressesUpdate(rawInput: unknown) {
  const input = asObject(rawInput);
  const id = str(input.id);
  const fields = dressFields(input);
  updateSandboxState((draft) => ({
    ...draft,
    dresses: draft.dresses.map((dress) =>
      dress.id === id ? { ...dress, ...fields } : dress,
    ),
  }));
  return { id };
}

function dressesSetActive(rawInput: unknown) {
  const input = asObject(rawInput);
  const id = str(input.id);
  const isActive = input.isActive === true;
  updateSandboxState((draft) => ({
    ...draft,
    dresses: draft.dresses.map((dress) =>
      dress.id === id ? { ...dress, isActive } : dress,
    ),
  }));
  return { id };
}

function dressesUpdateStatus(rawInput: unknown) {
  const input = asObject(rawInput);
  const id = str(input.id);
  const currentStatus = input.currentStatus as SandboxDressStatus;
  updateSandboxState((draft) => ({
    ...draft,
    dresses: draft.dresses.map((dress) =>
      dress.id === id ? { ...dress, currentStatus } : dress,
    ),
  }));
  return { id };
}

function dressesDelete(rawInput: unknown) {
  const id = str(asObject(rawInput).id);
  updateSandboxState((draft) => ({
    ...draft,
    dresses: draft.dresses.filter((dress) => dress.id !== id),
  }));
  return { id };
}

function dressesGetById(rawInput: unknown) {
  const id = str(asObject(rawInput).id);
  const dress = getSandboxState().dresses.find((item) => item.id === id);
  if (!dress) throw new Error("Dress not found");
  return toDressRow(dress);
}

/** Small images are kept as data URLs; large ones fall back to a placeholder. */
const MAX_INLINE_IMAGE_CHARS = 250_000;

function uploadImage(rawInput: unknown) {
  const input = asObject(rawInput);
  const mimeType = str(input.mimeType) ?? "image/png";
  const base64 = str(input.base64) ?? "";
  const url =
    base64.length <= MAX_INLINE_IMAGE_CHARS
      ? `data:${mimeType};base64,${base64}`
      : "/logo.png";
  return { url };
}

const PROCEDURES: Record<string, (input: unknown) => unknown> = {
  "branches.list": branchesList,
  "branches.create": branchesCreate,
  "branches.update": branchesUpdate,
  "branches.delete": branchesDelete,
  "dresses.list": dressesList,
  "dresses.filterOptions": dressesFilterOptions,
  "dresses.getById": dressesGetById,
  "dresses.create": dressesCreate,
  "dresses.update": dressesUpdate,
  "dresses.setActive": dressesSetActive,
  "dresses.updateStatus": dressesUpdateStatus,
  "dresses.delete": dressesDelete,
  uploadImage,
};

export function runSandboxProcedure(path: string, input: unknown): unknown {
  const procedure = PROCEDURES[path];
  if (!procedure) {
    throw new Error(`"${path}" is not part of the demo`);
  }
  return procedure(input);
}

/**
 * Browser-only data for the interactive sandbox.
 *
 * Everything lives in `localStorage` under one key. Nothing here ever reaches a
 * server: the sandbox swaps the tRPC link for one that reads and writes this
 * store, so the real screens run against it unchanged.
 */

export const SANDBOX_STORAGE_KEY = "gl-sandbox:v1";

export type SandboxBranch = {
  id: string;
  shortCode: string;
  nameEn: string;
  nameAr: string;
  addressEn: string | null;
  addressAr: string | null;
  phone: string | null;
  opensAt: string | null;
  closesAt: string | null;
  mapUrl: string | null;
  createdAt: string;
  /** True for rows the visitor created, so the tour can tell them from the seed. */
  userCreated: boolean;
};

export type SandboxDressStatus =
  | "available"
  | "atTailor"
  | "atDryCleaner"
  | "underRepair";

export type SandboxDress = {
  id: string;
  branchId: string;
  code: string;
  title: string;
  description: string | null;
  images: string[] | null;
  size: string | null;
  color: string | null;
  pricePerDay: number;
  depositAmount: number;
  insurance: number;
  timesRented: number;
  isActive: boolean;
  currentStatus: SandboxDressStatus;
  createdAt: string;
  userCreated: boolean;
};

export type SandboxState = {
  version: 1;
  branches: SandboxBranch[];
  dresses: SandboxDress[];
};

export const SANDBOX_OWNER = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Layla Hassan",
  email: "owner@demo.gateling.com",
} as const;

const SEED_AT = "2026-01-01T09:00:00.000Z";

const ZAMALEK_ID = "00000000-0000-4000-8000-0000000000b1";
const MAADI_ID = "00000000-0000-4000-8000-0000000000b2";

function seed(): SandboxState {
  return {
    version: 1,
    branches: [
      {
        id: ZAMALEK_ID,
        shortCode: "ZAM",
        nameEn: "Zamalek Atelier",
        nameAr: "أتيليه الزمالك",
        addressEn: "12 Hassan Sabry St, Zamalek, Cairo",
        addressAr: "١٢ شارع حسن صبري، الزمالك، القاهرة",
        phone: "01000000001",
        opensAt: "12:00",
        closesAt: "22:00",
        mapUrl: null,
        createdAt: SEED_AT,
        userCreated: false,
      },
      {
        id: MAADI_ID,
        shortCode: "MAD",
        nameEn: "Maadi Atelier",
        nameAr: "أتيليه المعادي",
        addressEn: "Road 9, Maadi, Cairo",
        addressAr: "شارع ٩، المعادي، القاهرة",
        phone: "01000000002",
        opensAt: "12:00",
        closesAt: "22:00",
        mapUrl: null,
        createdAt: SEED_AT,
        userCreated: false,
      },
    ],
    dresses: [
      seedDress(
        1,
        ZAMALEK_ID,
        "ZAM-001",
        "Ivory Lace Mermaid",
        "M",
        "Ivory",
        4500,
        3000,
      ),
      seedDress(
        2,
        ZAMALEK_ID,
        "ZAM-002",
        "Midnight Velvet Gown",
        "S",
        "Navy",
        3200,
        2000,
      ),
      seedDress(
        3,
        ZAMALEK_ID,
        "ZAM-003",
        "Rose Tulle Ballgown",
        "L",
        "Blush",
        5200,
        3500,
      ),
      seedDress(
        4,
        MAADI_ID,
        "MAD-001",
        "Emerald Satin Evening",
        "M",
        "Green",
        2800,
        1800,
      ),
      seedDress(
        5,
        MAADI_ID,
        "MAD-002",
        "Champagne Beaded Soirée",
        "S",
        "Champagne",
        3900,
        2500,
      ),
    ],
  };
}

function seedDress(
  n: number,
  branchId: string,
  code: string,
  title: string,
  size: string,
  color: string,
  pricePerDay: number,
  depositAmount: number,
): SandboxDress {
  return {
    id: `00000000-0000-4000-8000-0000000000d${n}`,
    branchId,
    code,
    title,
    description: null,
    images: null,
    size,
    color,
    pricePerDay,
    depositAmount,
    insurance: 0,
    timesRented: n * 3,
    isActive: true,
    currentStatus: "available",
    createdAt: SEED_AT,
    userCreated: false,
  };
}

const SEED_STATE: SandboxState = seed();

let cache: SandboxState | null = null;
const listeners = new Set<() => void>();

function isSandboxState(value: unknown): value is SandboxState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SandboxState>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.branches) &&
    Array.isArray(candidate.dresses)
  );
}

function readStorage(): SandboxState | null {
  try {
    const raw = window.localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSandboxState(parsed) ? parsed : null;
  } catch {
    // Private mode / blocked storage: the sandbox still works in memory.
    return null;
  }
}

/** Stable snapshot for `useSyncExternalStore` on the client. */
export function getSandboxState(): SandboxState {
  if (typeof window === "undefined") return SEED_STATE;
  if (!cache) cache = readStorage() ?? structuredClone(SEED_STATE);
  return cache;
}

/** Server and first-hydration snapshot: always the seed, never visitor data. */
export function getServerSandboxState(): SandboxState {
  return SEED_STATE;
}

function notify() {
  for (const listener of listeners) listener();
}

export function updateSandboxState(
  recipe: (draft: SandboxState) => SandboxState,
): SandboxState {
  const next = recipe(getSandboxState());
  cache = next;
  try {
    window.localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep working in memory when storage is full or blocked.
  }
  notify();
  return next;
}

export function resetSandboxState(): void {
  cache = structuredClone(SEED_STATE);
  try {
    window.localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // See above.
  }
  notify();
}

export function subscribeSandboxState(listener: () => void): () => void {
  listeners.add(listener);

  // The tour page and the app iframe are separate documents on one origin, so
  // a write in one arrives here as a `storage` event.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SANDBOX_STORAGE_KEY || event.key === null) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

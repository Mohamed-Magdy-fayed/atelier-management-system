/**
 * WhatsApp sender smoke check — proves the three sending modes resolve the way
 * the settings page claims, and that a stored API token never leaks back out.
 *
 * Like `smoke:import` this one WRITES (it drives settings 00006-00008 through
 * every mode), so it refuses to run against anything but localhost unless
 * SMOKE_ALLOW_REMOTE=1 is set, and it restores the original values on the way
 * out. The resolved host is printed before the first statement.
 *
 *   npm run smoke:whatsapp
 *
 * Exists because the interesting behaviour here is all negative space — the
 * token that must not appear in a payload, the `own` mode that must not fall
 * back to the platform sender — and none of that shows up in a typecheck.
 */
import { createRequire } from "node:module";
import path from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({
  path:
    process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), ".env.local"),
  override: true,
});

/**
 * `server-only` throws the moment it is required outside a bundler that aliases
 * it away, which is every plain-node script. The modules under test keep the
 * import — it is what stops the encryption key being pulled into a client
 * bundle — so the guard is satisfied here instead of being removed there.
 */
const nodeRequire = createRequire(import.meta.url);
const serverOnlyPath = nodeRequire.resolve("server-only");
nodeRequire.cache[serverOnlyPath] = new (
  nodeRequire("node:module") as typeof import("node:module")
).Module(serverOnlyPath) as never;
(nodeRequire.cache[serverOnlyPath] as { exports: unknown }).exports = {};
(nodeRequire.cache[serverOnlyPath] as { loaded: boolean }).loaded = true;

const FAKE_TOKEN = "wapilot_smoke_tok_ABCD1234efgh5678";
const FAKE_INSTANCE = "smoke-instance-01";

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is not set — nothing to check against.");
    process.exit(1);
  }

  const { hostname, pathname } = new URL(rawUrl);
  console.log(`Target: ${hostname}${pathname}`);

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocal && process.env.SMOKE_ALLOW_REMOTE !== "1") {
    console.error(
      "Refusing to run: this check writes settings rows and the target is not localhost.",
    );
    process.exit(1);
  }

  const { db, closeDbConnection } = await import("@/drizzle");
  const { eq, inArray } = await import("drizzle-orm");
  const { SettingsTable, UsersTable } = await import("@/drizzle/schema");
  const { mainTranslations } = await import("@/features/core/i18n/global");
  const { createI18n } = await import("@/features/core/i18n/lib");
  const { SYSTEM_SETTING_CODE } = await import(
    "@/features/system/settings/lib/system-settings-registry"
  );
  const { encryptSecret, decryptSecret, secretHint } = await import(
    "@/features/system/settings/server/secret-crypto"
  );
  const { listSettings } = await import(
    "@/features/system/settings/server/queries"
  );
  const { updateSetting } = await import(
    "@/features/system/settings/server/mutations"
  );
  const { resolveWhatsAppSender } = await import(
    "@/features/system/whatsapp/server/credentials"
  );

  const MODE = SYSTEM_SETTING_CODE.WHATSAPP_SENDING_MODE;
  const INSTANCE = SYSTEM_SETTING_CODE.WHATSAPP_INSTANCE_ID;
  const TOKEN = SYSTEM_SETTING_CODE.WHATSAPP_API_TOKEN;

  const { t } = createI18n(mainTranslations, "en", "en");

  const admin = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.role, "admin"),
    columns: { id: true, role: true },
  });

  if (!admin) {
    console.error("No admin user in this database — run the seed first.");
    process.exit(1);
  }

  const ctx = {
    db,
    t,
    cookies: { get: () => undefined },
    session: {
      user: { id: admin.id, role: admin.role },
      exp: Date.now() / 1000 + 3600,
    },
  } as never;

  let failures = 0;

  function check(label: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`,
    );
    if (!ok) failures++;
  }

  const original = await db
    .select({
      id: SettingsTable.id,
      code: SettingsTable.code,
      value: SettingsTable.value,
    })
    .from(SettingsTable)
    .where(inArray(SettingsTable.code, [MODE, INSTANCE, TOKEN]));

  if (original.length !== 3) {
    console.error(
      `Expected settings ${MODE}/${INSTANCE}/${TOKEN} to exist — run: npm run seed -- settings`,
    );
    process.exit(1);
  }

  const idByCode = new Map(original.map((row) => [row.code, row.id]));
  const idOf = (code: string) => idByCode.get(code) as string;

  async function setValue(code: string, value: string | null) {
    await updateSetting(ctx, { id: idOf(code), value });
  }

  async function rowFor(code: string) {
    const page = await listSettings(ctx, {
      page: 1,
      perPage: 100,
      sorting: [],
      globalFilter: undefined,
    } as never);
    return page.rows.find((row) => row.code === code);
  }

  try {
    // --- The crypto itself: a round trip, and a hint that reveals only a tail.
    console.log("\ncrypto");
    const wrapped = encryptSecret(FAKE_TOKEN);
    check("ciphertext is versioned", wrapped.startsWith("v1:"), true);
    check("ciphertext hides the plaintext", wrapped.includes(FAKE_TOKEN), false);
    check("round trip", decryptSecret(wrapped), FAKE_TOKEN);
    check("two encryptions differ (random iv)", wrapped === encryptSecret(FAKE_TOKEN), false);
    check("hint shows only the tail", secretHint(FAKE_TOKEN), "••••5678");

    // --- Storing a token must not make it retrievable through the grid.
    console.log("\nsecret never leaves the server");
    await setValue(TOKEN, FAKE_TOKEN);

    const storedRaw = await db
      .select({ value: SettingsTable.value })
      .from(SettingsTable)
      .where(eq(SettingsTable.code, TOKEN));
    check(
      "stored at rest as ciphertext",
      storedRaw[0]?.value?.startsWith("v1:"),
      true,
    );
    check(
      "plaintext absent from the column",
      storedRaw[0]?.value?.includes(FAKE_TOKEN),
      false,
    );

    const tokenRow = await rowFor(TOKEN);
    check("value withheld from the client", tokenRow?.value, null);
    check("hint returned instead", tokenRow?.valueHint, "••••5678");
    check("hasValue true", tokenRow?.hasValue, true);
    check(
      "serialized row contains no plaintext",
      JSON.stringify(tokenRow).includes(FAKE_TOKEN),
      false,
    );
    check(
      "serialized row contains no ciphertext",
      JSON.stringify(tokenRow).includes("v1:"),
      false,
    );

    // Searching the token (or its tail) must not confirm it is stored.
    const searchHit = await listSettings(ctx, {
      page: 1,
      perPage: 100,
      sorting: [],
      globalFilter: FAKE_TOKEN,
    } as never);
    check("token is not searchable", searchHit.total, 0);

    // --- Mode resolution.
    console.log("\nmode resolution");

    await setValue(MODE, "off");
    check("off", (await resolveWhatsAppSender(db)).mode, "off");

    await setValue(MODE, "own");
    await setValue(INSTANCE, null);
    check(
      "own without instance id is unconfigured",
      await resolveWhatsAppSender(db),
      { mode: "unconfigured", reason: "ownMissingInstanceId" },
    );

    await setValue(INSTANCE, FAKE_INSTANCE);
    await setValue(TOKEN, null);
    check("own without token is unconfigured", await resolveWhatsAppSender(db), {
      mode: "unconfigured",
      reason: "ownMissingToken",
    });

    // The point of the whole design: an incomplete `own` must never quietly
    // become `platform` and send from the wrong number.
    check(
      "incomplete own never falls back to platform",
      (await resolveWhatsAppSender(db)).mode === "platform",
      false,
    );

    await setValue(TOKEN, FAKE_TOKEN);
    const own = await resolveWhatsAppSender(db);
    check("own resolves", own.mode, "own");
    check(
      "own decrypts the stored token",
      own.mode === "own" ? own.token : null,
      FAKE_TOKEN,
    );
    check(
      "own uses the stored instance id",
      own.mode === "own" ? own.instanceId : null,
      FAKE_INSTANCE,
    );

    await setValue(MODE, "platform");
    const platform = await resolveWhatsAppSender(db);
    const platformConfigured = Boolean(
      process.env.WAPILOT_INSTANCE_ID && process.env.WAPILOT_API_TOKEN,
    );
    check(
      "platform reflects env configuration",
      platform.mode,
      platformConfigured ? "platform" : "unconfigured",
    );

    // --- The message itself: branding belongs to the platform sender only.
    console.log("\nmessage");
    const { buildReservationMessage } = await import(
      "@/features/system/whatsapp/lib/reservation-message"
    );
    const { toWhatsAppChatId } = await import("@/lib/phone");

    const messageData = {
      customerName: "Nour",
      branchName: "Maadi",
      reservationCode: "RES-MAA-20260809-004",
      dressTitle: "Ivory A-Line Gown",
      dressCode: "DR-0001",
      receivingDateTime: new Date("2026-09-01T15:00:00Z"),
      occasionDate: new Date("2026-09-03T00:00:00Z"),
      returnDateTime: new Date("2026-09-05T15:00:00Z"),
      totalPrice: 1500,
      discount: 200,
      insurance: 300,
      depositPaid: 500,
    };

    const platformMessage = buildReservationMessage({
      t,
      locale: "en",
      timeZone: "Africa/Cairo",
      mode: "platform",
      data: messageData,
    });
    const ownMessage = buildReservationMessage({
      t,
      locale: "en",
      timeZone: "Africa/Cairo",
      mode: "own",
      data: messageData,
    });

    check(
      "platform message is branded",
      platformMessage.includes("Gateling Atelier"),
      true,
    );
    check(
      "own message is not branded",
      ownMessage.includes("Gateling Atelier"),
      false,
    );
    check(
      "message carries the reservation code",
      platformMessage.includes("RES-MAA-20260809-004"),
      true,
    );
    // total 1500 - discount 200 = 1300 due, 500 paid, so 800 remains.
    check("outstanding is computed", platformMessage.includes("800"), true);
    check(
      "no untranslated placeholders",
      /\{[a-zA-Z]+\}/.test(platformMessage),
      false,
    );

    const arabicMessage = buildReservationMessage({
      t: createI18n(mainTranslations, "ar", "en").t,
      locale: "ar",
      timeZone: "Africa/Cairo",
      mode: "own",
      data: messageData,
    });
    check(
      "arabic message is translated",
      arabicMessage.includes("الفستان"),
      true,
    );

    // Stored phones come in several shapes; all must address the same chat.
    check("national phone", toWhatsAppChatId("01001234567"), "201001234567@c.us");
    check(
      "country-coded phone",
      toWhatsAppChatId("+20 100 123 4567"),
      "201001234567@c.us",
    );
    check("blank phone", toWhatsAppChatId(""), null);

    // --- Wapilot calls a healthy session WORKING, not "connected". Getting
    // this wrong reported a live instance as disconnected in production.
    console.log("\nstatus vocabulary");
    const { classifyWapilotStatus } = await import(
      "@/features/system/whatsapp/server/diagnostics"
    );
    check("WORKING is healthy", classifyWapilotStatus("WORKING"), null);
    check("working (lowercase) is healthy", classifyWapilotStatus("working"), null);
    check(
      "SCAN_QR_CODE needs a re-scan",
      classifyWapilotStatus("SCAN_QR_CODE"),
      "instanceNotConnected",
    );
    check(
      "STARTING says wait, not re-scan",
      classifyWapilotStatus("STARTING"),
      "instanceStarting",
    );
    check(
      "FAILED is not healthy",
      classifyWapilotStatus("FAILED"),
      "instanceNotConnected",
    );
    check(
      "unknown state is not silently healthy",
      classifyWapilotStatus("SOMETHING_NEW"),
      "instanceNotConnected",
    );

    // --- A value outside the enum must be refused.
    console.log("\nmode validation");
    let rejected = false;
    try {
      await setValue(MODE, "carrier-pigeon");
    } catch {
      rejected = true;
    }
    check("unknown mode rejected", rejected, true);
  } finally {
    console.log("\ncleanup");
    for (const row of original) {
      await db
        .update(SettingsTable)
        .set({ value: row.value })
        .where(eq(SettingsTable.id, row.id));
    }
    console.log("  restored original settings values");
    await closeDbConnection();
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll WhatsApp checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

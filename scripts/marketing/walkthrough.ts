import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Browser, chromium, type Locator, type Page } from "playwright";

/**
 * Records a ~60s phone-sized walkthrough of «أتيليه لمسة»: dashboard, dresses,
 * a new booking with a deposit, the receipt, pickup day and the bride-facing
 * catalog. Chrome's screencast captures it at full phone resolution into
 * marketing/video/walkthrough-frames/, with an ffmpeg concat list and a scene
 * log of the second each scene starts, which the voiceover is timed against.
 * Playwright's own recorder is not used: it ignores the device pixel ratio.
 *
 * Run through `npm run marketing:walkthrough` with `npm run marketing:dev` up
 * and a fresh `npm run marketing:seed`: unlike the screenshot run, this one
 * saves a booking and changes its status, in the local marketing database only.
 */

const BASE_URL = process.env.MARKETING_BASE_URL ?? "http://localhost:3100";
const OUT_DIR = path.join(process.cwd(), "marketing", "video");
const BRAND_AR = "أتيليه لمسة";
const FORBIDDEN_TEXT = ["قويسنا", "شبين"];
const HERO_DRESS = "NSR-D-001";
const CUSTOMER_NAME = "نادين وليد منصور";
const CUSTOMER_PHONE = "01000050999";
const DEPOSIT = "2500";
const OCCASION_OFFSET_DAYS = 12;

const VIEWPORT = { width: 430, height: 932 };
const PIXEL_RATIO = 3;
const FRAMES_DIR = path.join(OUT_DIR, "walkthrough-frames");
/** Opened once off camera, so the dev server compiles them before the take. */
const WARM_UP_ROUTES = ["/dashboard", "/dresses", "/reservations", "/browse"];
/** Some pages keep a pulsing element forever; don't let it stall the take. */
const SKELETON_TIMEOUT_MS = 1_500;

/** The dev badge and toasts that are not ours, and a caret that blinks. */
const CAPTURE_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display: none !important; }
  * { caret-color: transparent !important; }
`;

/** A soft ring where each tap lands, so a viewer can follow the finger. */
const TAP_MARKER = `
  window.addEventListener("pointerdown", (event) => {
    const ring = document.createElement("div");
    ring.style.cssText = [
      "position:fixed", "z-index:2147483647", "pointer-events:none",
      "width:44px", "height:44px", "border-radius:50%",
      "left:" + (event.clientX - 22) + "px", "top:" + (event.clientY - 22) + "px",
      "background:rgba(254,110,0,.28)", "border:2px solid rgba(254,110,0,.85)",
      "transition:transform .5s ease-out, opacity .5s ease-out",
    ].join(";");
    document.documentElement.appendChild(ring);
    requestAnimationFrame(() => { ring.style.transform = "scale(1.6)"; ring.style.opacity = "0"; });
    setTimeout(() => ring.remove(), 600);
  }, true);
`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is not set (run through npm run marketing:walkthrough).`);
  return value;
}

function localDay(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page
    .waitForFunction(
      () => document.querySelectorAll('[data-slot="skeleton"], .animate-pulse').length === 0,
      undefined,
      { timeout: SKELETON_TIMEOUT_MS },
    )
    .catch(() => undefined);
}

async function assertSeededAtelier(page: Page) {
  const text = await page.locator("body").innerText();
  const leaked = FORBIDDEN_TEXT.filter((word) => text.includes(word));
  if (leaked.length > 0)
    throw new Error(`Real client data on screen (${leaked.join(", ")}). Aborting.`);
  if (!(await page.title()).includes(BRAND_AR))
    throw new Error(`Page title is "${await page.title()}", not ${BRAND_AR}. Aborting.`);
}

/** Signs in off camera and hands back the session for the recorded context. */
async function signedInState(browser: Browser) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "ar-EG" });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "ar", url: BASE_URL }]);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/sign-in`);
  await page.waitForLoadState("networkidle");
  const email = page.locator('input[type="email"]');
  await email.fill(requireEnv("SEED_ADMIN_EMAIL"));
  await email.press("Enter");
  const password = page.locator('input[type="password"]');
  await password.waitFor();
  await password.fill(requireEnv("SEED_ADMIN_PASSWORD"));
  await password.press("Enter");
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  for (const route of WARM_UP_ROUTES) {
    await page.goto(`${BASE_URL}${route}`);
    await page.waitForLoadState("networkidle");
  }
  // The booking dialog is its own chunk; open it once so it is compiled too.
  await page.goto(`${BASE_URL}/reservations`);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "إضافة الحجوزات" })
    .click({ timeout: 10_000 })
    .then(() => page.getByRole("dialog").waitFor())
    .catch(() => console.warn("  ⚠ booking dialog not warmed up"));
  const state = await context.storageState();
  await context.close();
  return state;
}

/** Scrolls whatever is scrollable under the middle of the screen, gently. */
async function glide(page: Page, distance: number, steps = 12) {
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await pause(page, 60);
  }
}

async function tap(page: Page, target: Locator, hold = 350) {
  await target.scrollIntoViewIfNeeded();
  await target.click();
  await pause(page, hold);
}

async function typeSlowly(target: Locator, text: string) {
  await target.click();
  await target.pressSequentially(text, { delay: 70 });
}

async function navTo(page: Page, label: string, urlPart: string) {
  await tap(page, page.getByRole("link", { name: label }).last());
  await page.waitForURL(new RegExp(urlPart));
  await settle(page);
  await assertSeededAtelier(page);
}

async function openRowMenu(page: Page) {
  const row = page.getByRole("row").filter({ hasText: CUSTOMER_NAME }).first();
  await row.scrollIntoViewIfNeeded();
  await tap(page, row.getByRole("button", { name: "فتح القائمة" }), 500);
}

async function record(browser: Browser) {
  const storageState = await signedInState(browser);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: PIXEL_RATIO,
    isMobile: true,
    hasTouch: true,
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
    colorScheme: "light",
    storageState,
  });
  await context.addInitScript(TAP_MARKER);
  // Injected before any page script, so the dev badge never shows in a frame.
  await context.addInitScript(`
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ${JSON.stringify(CAPTURE_CSS)};
      document.head.appendChild(style);
    });
  `);
  const page = await context.newPage();

  rmSync(FRAMES_DIR, { recursive: true, force: true });
  mkdirSync(FRAMES_DIR, { recursive: true });
  const frames: { file: string; at: number }[] = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", (frame) => {
    const file = `${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(path.join(FRAMES_DIR, file), Buffer.from(frame.data, "base64"));
    frames.push({ file, at: frame.metadata.timestamp ?? Date.now() / 1000 });
    void cdp
      .send("Page.screencastFrameAck", { sessionId: frame.sessionId })
      .catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: VIEWPORT.width * PIXEL_RATIO,
    maxHeight: VIEWPORT.height * PIXEL_RATIO,
  });
  const startedAt = Date.now();
  const scenes: { scene: string; at: number }[] = [];
  const mark = (scene: string) => {
    const at = Math.round((Date.now() - startedAt) / 100) / 10;
    scenes.push({ scene, at });
    console.info("  %ss  %s", at.toFixed(1), scene);
  };

  try {
    await page.goto(`${BASE_URL}/dashboard`);
    await settle(page);
    await assertSeededAtelier(page);

    mark("dashboard");
    await pause(page, 2500);
    await glide(page, 900, 18);
    await pause(page, 2000);

    mark("dresses");
    await navTo(page, "الفساتين", "/dresses");
    await pause(page, 2000);
    await glide(page, 500);
    await pause(page, 1200);

    mark("new-booking");
    await navTo(page, "الحجوزات", "/reservations");
    await pause(page, 1000);
    await tap(page, page.getByRole("button", { name: "إضافة الحجوزات" }), 800);
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await typeSlowly(dialog.getByPlaceholder("ابحث عن فستان…"), HERO_DRESS);
    await pause(page, 700);
    await tap(page, page.getByRole("option", { name: new RegExp(HERO_DRESS) }).first(), 700);

    mark("calendar");
    await tap(page, dialog.getByRole("button").filter({ hasText: "تاريخ المناسبة" }).first(), 500);
    await page.locator('[data-slot="calendar"], .rdp-root').first().waitFor();
    await pause(page, 3500);
    const day = page.locator(`[data-day="${localDay(OCCASION_OFFSET_DAYS)}"] button`).first();
    if (!(await day.isVisible().catch(() => false))) {
      await tap(page, page.locator(".rdp-button_next").first(), 600);
    }
    await tap(page, day, 900);

    mark("customer");
    await tap(page, dialog.getByRole("button", { name: "التالي" }), 600);
    await typeSlowly(dialog.getByRole("textbox", { name: "اسم العميل" }), CUSTOMER_NAME);
    await typeSlowly(dialog.locator('input[type="tel"]'), CUSTOMER_PHONE);
    await pause(page, 600);

    mark("deposit");
    await tap(page, dialog.getByRole("button", { name: "التالي" }), 600);
    await dialog.evaluate((element) => element.scrollTo?.({ top: 0 }));
    const deposit = dialog.getByRole("spinbutton", { name: "المقدم المدفوع" });
    await deposit.click();
    await deposit.fill("");
    await deposit.pressSequentially(DEPOSIT, { delay: 120 });
    await pause(page, 2200);
    await tap(page, dialog.getByRole("button", { name: "إنشاء" }), 2200);
    await dialog.waitFor({ state: "hidden" });
    await settle(page);

    mark("receipt");
    await openRowMenu(page);
    await tap(page, page.getByRole("menuitem", { name: "إيصال الحجز" }), 3800);
    await page.keyboard.press("Escape");
    await pause(page, 600);

    mark("pickup");
    await openRowMenu(page);
    await tap(page, page.getByRole("menuitem", { name: "تعديل الحالة" }), 600);
    await tap(page, page.getByRole("menuitem", { name: "تم الاستلام" }), 2000);
    await openRowMenu(page);
    await tap(page, page.getByRole("menuitem", { name: "تحصيل مبلغ" }), 3500);
    await page.keyboard.press("Escape");
    await pause(page, 500);

    mark("catalog");
    await page.goto(`${BASE_URL}/browse`);
    await settle(page);
    await assertSeededAtelier(page);
    await pause(page, 1500);
    await glide(page, 1400, 24);
    await pause(page, 2000);
    mark("end");
  } finally {
    await cdp.send("Page.stopScreencast").catch(() => undefined);
    await context.close();
  }

  // The screencast sends a frame only when the screen changes, so each frame is
  // held until the next one arrives. Scene times share the frames' clock.
  const lines = frames.map((frame, i) => {
    const next = frames[i + 1]?.at ?? frame.at + 0.5;
    return `file '${frame.file}'\nduration ${Math.max(next - frame.at, 0.001).toFixed(3)}`;
  });
  writeFileSync(path.join(FRAMES_DIR, "frames.txt"), `${lines.join("\n")}\n`);
  const firstFrameAt = frames[0] ? frames[0].at - startedAt / 1000 : 0;
  writeFileSync(
    path.join(OUT_DIR, "walkthrough-scenes.json"),
    `${JSON.stringify({ firstFrameAt: Math.round(firstFrameAt * 10) / 10, scenes }, null, 2)}\n`,
  );
  console.info("\n✓ %d frames in %s", frames.length, path.relative(process.cwd(), FRAMES_DIR));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await record(browser);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});

import { mkdirSync } from "node:fs";
import path from "node:path";
import { type Browser, chromium, type Locator, type Page } from "playwright";

/**
 * Captures the five marketing screens of «أتيليه لمسة» in Arabic, at a phone
 * and a desktop size, into marketing/screenshots/.
 *
 * Run through `npm run marketing:shots` with `npm run marketing:dev` already up:
 * the launcher pins every variable to the isolated marketing stack, and this
 * script refuses to shoot anything that does not look like the seeded atelier.
 * It never saves a form, so re-running it leaves the database untouched.
 */

const BASE_URL = process.env.MARKETING_BASE_URL ?? "http://localhost:3100";
const OUT_DIR = path.join(process.cwd(), "marketing", "screenshots");
const BRAND_AR = "أتيليه لمسة";
/** Branch names from the real client's data. Seeing either means wrong database. */
const FORBIDDEN_TEXT = ["قويسنا", "شبين"];
const HERO_DRESS = "NSR-D-001";
/** Days from today for the booking in screen 3 — free on the hero dress. */
const DEMO_OCCASION_OFFSET = 12;

const VIEWPORTS = [
  {
    name: "mobile",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "desktop",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  },
] as const;

type Viewport = (typeof VIEWPORTS)[number];

/** The Next.js dev badge and toasts, plus motion that would blur a capture. */
const CAPTURE_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display: none !important; }
  *, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} is not set (run through npm run marketing:shots).`,
    );
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

/** Network quiet, no loading skeletons, every image decoded. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('[data-slot="skeleton"], .animate-pulse')
          .length === 0,
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => console.warn("  ⚠ skeletons still visible after 20s"));
  await page.waitForFunction(
    () =>
      [...document.images].every(
        (image) => image.complete && (image.naturalWidth > 0 || !image.src),
      ),
    undefined,
    { timeout: 20_000 },
  );
  await page.addStyleTag({ content: CAPTURE_CSS });
  await page.waitForTimeout(400);
}

async function assertSeededAtelier(page: Page) {
  const text = await page.locator("body").innerText();
  const leaked = FORBIDDEN_TEXT.filter((word) => text.includes(word));
  if (leaked.length > 0) {
    throw new Error(
      `Real client data on screen (${leaked.join(", ")}). Wrong database — aborting.`,
    );
  }
  if (!(await page.title()).includes(BRAND_AR)) {
    throw new Error(
      `Page title is "${await page.title()}", not ${BRAND_AR}. Aborting.`,
    );
  }
}

async function shoot(page: Page, viewport: Viewport, file: string) {
  const target = path.join(OUT_DIR, `${file}-${viewport.name}.png`);
  await page.screenshot({ path: target });
  console.info("  ✓ %s", path.relative(process.cwd(), target));
}

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/sign-in`);
  // Typing before hydration falls through to a native GET submit, which puts the
  // email in the URL and never reaches the password step.
  await page.waitForLoadState("networkidle");
  const email = page.locator('input[type="email"]');
  await email.fill(requireEnv("SEED_ADMIN_EMAIL"));
  await email.press("Enter");
  const password = page.locator('input[type="password"]');
  await password.waitFor();
  await password.fill(requireEnv("SEED_ADMIN_PASSWORD"));
  await password.press("Enter");
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function openNewBooking(page: Page): Promise<Locator> {
  await page.goto(`${BASE_URL}/reservations`);
  await settle(page);
  await page.getByRole("button", { name: "إضافة الحجوزات" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();

  await dialog.getByPlaceholder("ابحث عن فستان…").fill(HERO_DRESS);
  await page
    .getByRole("option", { name: new RegExp(HERO_DRESS) })
    .first()
    .click();
  return dialog;
}

async function openOccasionCalendar(page: Page, dialog: Locator) {
  await dialog
    .getByRole("button")
    .filter({ hasText: "تاريخ المناسبة" })
    .first()
    .click();
  await page.locator('[data-slot="calendar"], .rdp-root').first().waitFor();
}

async function pickDay(page: Page, isoDay: string) {
  const day = page.locator(`[data-day="${isoDay}"] button`).first();
  if (!(await day.isVisible().catch(() => false))) {
    await page
      .locator(".rdp-button_next, [aria-label*='Next'], [aria-label*='التالي']")
      .first()
      .click();
  }
  await day.click();
}

async function captureViewport(browser: Browser, viewport: Viewport) {
  console.info(
    "\n%s (%dx%d @%dx)",
    viewport.name,
    viewport.viewport.width,
    viewport.viewport.height,
    viewport.deviceScaleFactor,
  );
  const context = await browser.newContext({
    viewport: viewport.viewport,
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
    colorScheme: "light",
  });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "ar", url: BASE_URL },
  ]);
  const page = await context.newPage();

  try {
    await signIn(page);
    await settle(page);
    await assertSeededAtelier(page);

    // 1. Dress list.
    await page.goto(`${BASE_URL}/dresses`);
    await settle(page);
    await assertSeededAtelier(page);
    await shoot(page, viewport, "01-dress-list");

    // 1b. The admin list has no photos; the public catalog shows the same
    // dresses with theirs, which reads better in a video.
    await page.goto(`${BASE_URL}/browse`);
    await settle(page);
    await assertSeededAtelier(page);
    await shoot(page, viewport, "01b-dress-catalog");

    // 2. The hero dress's availability: booked days are disabled in its picker.
    const dialog = await openNewBooking(page);
    await openOccasionCalendar(page, dialog);
    await settle(page);
    await shoot(page, viewport, "02-dress-calendar");

    // 3. A new booking with a deposit, up to — never past — the save button.
    await pickDay(page, localDay(DEMO_OCCASION_OFFSET));
    await dialog.getByRole("button", { name: "التالي" }).click();
    await dialog
      .getByRole("textbox", { name: "اسم العميل" })
      .fill("نادين وليد منصور");
    await dialog.locator('input[type="tel"]').fill("01000050999");
    await dialog.getByRole("button", { name: "التالي" }).click();
    await dialog
      .getByRole("spinbutton", { name: "المقدم المدفوع" })
      .fill("2500");
    await dialog.evaluate((element) => element.scrollTo?.({ top: 0 }));
    await settle(page);
    await shoot(page, viewport, "03-booking-deposit");
    await page.keyboard.press("Escape");

    // 4. No fittings in the product: upcoming pickups and occasions instead.
    await page.goto(`${BASE_URL}/dashboard`);
    await settle(page);
    const upcoming = page.getByText("استلامات قادمة", { exact: true }).first();
    await upcoming.scrollIntoViewIfNeeded();
    await upcoming.evaluate((element) =>
      element.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    await page.mouse.wheel(0, -60);
    await settle(page);
    await shoot(page, viewport, "04-upcoming-pickups");

    // 5. Dashboard overview, from the top.
    await page.goto(`${BASE_URL}/dashboard`);
    await settle(page);
    await shoot(page, viewport, "05-dashboard");
  } finally {
    await context.close();
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      await captureViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }
  console.info("\nDone. Review every image before it leaves this machine.");
}

main().catch((error: unknown) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});

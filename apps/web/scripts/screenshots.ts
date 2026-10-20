import { chromium } from "@playwright/test";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.SCREENSHOT_DIR ?? "screenshots";

const PAGES = [
  ["login", "/login"],
  ["dashboard", "/dashboard"],
  ["drafts", "/drafts"],
  ["activity", "/activity"],
  ["connections", "/connections"],
  ["analytics", "/analytics"],
  ["notifications", "/notifications"],
  ["settings", "/settings"],
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL ?? "admin@careerpulse.local");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD ?? "careerpulse");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/dashboard/);

  for (const [name, path] of PAGES) {
    if (name === "login") continue;
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log(`captured ${name}`);
  }

  // The draft review screen needs an id.
  const draftId = await page.evaluate(async () => {
    const response = await fetch("/api/drafts");
    const drafts = (await response.json()) as { id: string }[];
    return drafts[0]?.id ?? "";
  });
  if (draftId) {
    await page.goto(`${BASE}/drafts/${draftId}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.screenshot({ path: `${OUT}/draft-review.png`, fullPage: true });
    console.log("captured draft-review");
  }

  // Dark mode on the dashboard.
  await page.goto(`${BASE}/dashboard`);
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark");
  });
  await page.reload();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.screenshot({ path: `${OUT}/dashboard-dark.png`, fullPage: true });
  console.log("captured dashboard-dark");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

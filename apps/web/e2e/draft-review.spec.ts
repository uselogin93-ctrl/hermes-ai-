import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@careerpulse.local";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "careerpulse";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("the dashboard shows connection health and the draft inbox", async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Waiting for review", { exact: true })).toBeVisible();
  await expect(page.getByText("Posting streak", { exact: true })).toBeVisible();
});

test("a draft can be reviewed and rejected after confirmation", async ({ page }) => {
  await signIn(page);

  await page.goto("/drafts");
  const firstDraft = page.locator("a[href^='/drafts/']").first();
  await expect(firstDraft).toBeVisible();
  await firstDraft.click();

  await expect(page.getByRole("heading", { name: /Review the draft for/ })).toBeVisible();
  await expect(page.getByText("Source evidence", { exact: true })).toBeVisible();
  await expect(page.getByText("Compliance review", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("heading", { name: "Reject this draft?" })).toBeVisible();
  await page.getByRole("button", { name: "Reject draft" }).click();

  await expect(page.getByText("Draft rejected.")).toBeVisible();
});

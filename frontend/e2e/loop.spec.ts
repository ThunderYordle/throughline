import { expect, test } from "@playwright/test";

test("draft to plan to review, with a clip and a note", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Plan as/ }).first().click();
  await expect(page.getByRole("heading", { name: "Game plan" })).toBeVisible();
  await expect(page.locator("li", { hasText: "games" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(page.getByRole("heading", { name: /Plan followed \d+ of \d+/ })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();

  const entry = page.locator("li").filter({ has: page.getByRole("button", { name: "Confirm" }) }).first();
  await entry.getByRole("button", { name: "Confirm" }).click();
  await entry.getByPlaceholder("Note for the players").fill("Watch the timing");
  await entry.getByPlaceholder("Note for the players").blur();
  await page.reload();
  await expect(page.getByPlaceholder("Note for the players").first()).toHaveValue("Watch the timing");
});

test("a read-only review link shows notes but no controls", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Plan as/ }).first().click();
  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(page.getByRole("heading", { name: /Plan followed/ })).toBeVisible();
  const url = page.url();
  const other = await (await browser.newContext()).newPage();
  await other.goto(url);
  await expect(other.getByRole("heading", { name: /Plan followed/ })).toBeVisible();
  await expect(other.getByRole("button", { name: "Confirm" })).toHaveCount(0);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = violations.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(summary).toEqual([]);
}

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  // 13:15 today: the seed then has a finished, an ongoing and an upcoming booking.
  test.beforeEach(async ({ page }) => {
    const now = new Date();
    now.setHours(13, 15, 0, 0);
    await page.clock.setFixedTime(now);
  });

  test("schedule for today", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Идёт сейчас")).toBeVisible();
    await expectNoViolations(page);
  });

  test("read-only past date", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Предыдущий день" }).click();
    await expect(page.getByText(/Это прошедшая дата/)).toBeVisible();
    await expectNoViolations(page);
  });

  test("booking form with a validation error", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mock API" }).click();
    await page.getByLabel("Конфликт при следующем сохранении").check();
    await page.getByRole("button", { name: "Скрыть панель" }).click();
    await page.getByRole("button", { name: "Новая бронь" }).click();
    const dialog = page.getByRole("dialog", { name: "Новая бронь" });
    await dialog.getByRole("button", { name: "Забронировать" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expectNoViolations(page);
  });

  test("mock API panel", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mock API" }).click();
    await expect(page.getByRole("region", { name: "Управление mock API" })).toBeVisible();
    await expectNoViolations(page);
  });
});

import { expect, type Page, test } from "@playwright/test";

async function setVisibility(page: Page, state: "hidden" | "visible") {
  await page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", { value, configurable: true });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  }, state);
}

test("keeps mocking after the browser restarts the service worker", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Stopping workers needs the Chrome DevTools Protocol");

  await page.goto("/");
  await expect(page.getByRole("button", { name: /Стендап 09:30–10:00/ })).toBeVisible();

  await setVisibility(page, "hidden");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("ServiceWorker.enable");
  await cdp.send("ServiceWorker.stopAllWorkers");
  await setVisibility(page, "visible");

  await page.getByRole("button", { name: "Следующий день" }).click();
  await expect(page.getByRole("button", { name: /Планирование 10:00–11:00/ })).toBeVisible();
  await expect(page.getByText(/Не удалось (загрузить|обновить)/)).toBeHidden();
});

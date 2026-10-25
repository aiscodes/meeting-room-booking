import { expect, type Page, test } from "@playwright/test";

// A week ahead: empty in the seed data, no past slots.
function futureDate(days = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function openEmptyDay(page: Page) {
  await page.goto(`/?date=${futureDate()}`);
  await expect(page.getByText("На эту дату броней нет.")).toBeVisible();
}

async function createBooking(page: Page, title: string) {
  await page.getByRole("button", { name: "Новая бронь" }).click();
  const dialog = page.getByRole("dialog", { name: "Новая бронь" });
  await dialog.getByLabel("Название").fill(title);
  await dialog.getByRole("button", { name: "Забронировать" }).click();
  return dialog;
}

test("creates, edits and deletes a booking", async ({ page }) => {
  await openEmptyDay(page);

  const dialog = await createBooking(page, "Смоук-тест");
  await expect(dialog).toBeHidden();
  const booking = page.getByRole("button", { name: /Смоук-тест, 09:00–10:00/ });
  await expect(booking).toBeVisible();

  await booking.click();
  const edit = page.getByRole("dialog", { name: "Изменить бронь" });
  await edit.getByLabel("Окончание").selectOption("10:30");
  await edit.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByRole("button", { name: /Смоук-тест, 09:00–10:30/ })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Смоук-тест, 09:00–10:30/ }).click();
  await page.getByRole("dialog", { name: "Изменить бронь" }).getByRole("button", { name: "Удалить" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Удалить" }).click();
  await expect(page.getByText("На эту дату броней нет.")).toBeVisible();
});

test("moves a booking to another date and returns with the back button", async ({ page }) => {
  await openEmptyDay(page);
  await createBooking(page, "Перенос");

  await page.getByRole("button", { name: /Перенос, 09:00–10:00/ }).click();
  const edit = page.getByRole("dialog", { name: "Изменить бронь" });
  await edit.getByLabel("Дата").fill(futureDate(8));
  await edit.getByRole("button", { name: "Сохранить" }).click();

  await expect(page).toHaveURL(new RegExp(`date=${futureDate(8)}`));
  await expect(page.getByRole("button", { name: /Перенос, 09:00–10:00/ })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`date=${futureDate()}`));
  await expect(page.getByText("На эту дату броней нет.")).toBeVisible();
});

test("keeps the form and explains a 409 from the server", async ({ page }) => {
  await openEmptyDay(page);

  await page.getByRole("button", { name: "Mock API" }).click();
  await page.getByLabel("Конфликт при следующем сохранении").check();
  await page.getByRole("button", { name: "Скрыть панель" }).click();

  const dialog = await createBooking(page, "Важная встреча");
  await expect(dialog.getByRole("alert")).toContainText("занял другой пользователь");
  await expect(dialog.getByLabel("Название")).toHaveValue("Важная встреча");
  // The schedule behind an open modal is aria-hidden.
  await expect(
    page.getByRole("button", { name: /Другой пользователь, 09:00–10:00/, includeHidden: true }),
  ).toBeAttached();
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMockControls, type MockControlsStore } from "@/mocks/controls";
import { createHandlers } from "@/mocks/handlers";
import { type BookingStore, createBookingStore } from "@/mocks/store";
import { NowProvider } from "@/features/bookings/now";
import { BookingApp } from "./booking-app";

// 15 Jan 2030, 08:00 — before the working day, so every slot is still bookable.
const NOW = new Date(2030, 0, 15, 8, 0);
const TODAY = "2030-01-15";

const server = setupServer();
let store: BookingStore;
let controls: MockControlsStore;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  store = createBookingStore({
    seed: () => [{ id: "standup", date: TODAY, start: "09:00", end: "10:00", title: "Стендап" }],
  });
  controls = createMockControls({ latencyMs: 0 });
  server.resetHandlers(...createHandlers({ store, controls, now: () => NOW }));
  window.history.replaceState(null, "", "/");
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const tree = (now: Date) => (
    <QueryClientProvider client={client}>
      <NowProvider value={now}>
        <BookingApp />
      </NowProvider>
    </QueryClientProvider>
  );
  const { rerender } = render(tree(NOW));
  return Object.assign(userEvent.setup(), { setNow: (now: Date) => rerender(tree(now)) });
}

const schedule = () => screen.getByRole("list", { name: /Расписание/, hidden: true });

async function openNewBooking(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ });
  await user.click(screen.getByRole("button", { name: "Новая бронь" }));
  return screen.findByRole("dialog");
}

describe("BookingApp", () => {
  it("creates a booking with the suggested slot", async () => {
    const user = renderPage();
    const dialog = await openNewBooking(user);

    expect(within(dialog).getByLabelText("Начало")).toHaveValue("10:00");
    expect(within(dialog).getByLabelText("Окончание")).toHaveValue("11:00");
    await user.type(within(dialog).getByLabelText(/Название/), "Планирование");
    await user.click(within(dialog).getByRole("button", { name: "Забронировать" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /Планирование, 10:00–11:00/ })).toBeInTheDocument();
    expect(store.list(TODAY)).toHaveLength(2);
  });

  it("handles a 409 from stale data: keeps input, explains, refreshes the list", async () => {
    const user = renderPage();
    const dialog = await openNewBooking(user);
    await user.type(within(dialog).getByLabelText(/Название/), "Планирование");

    // Someone else books an overlapping slot; the UI still thinks 10:00–11:00 is free.
    store.insert({ date: TODAY, start: "10:30", end: "11:30", title: "Другой пользователь" });
    await user.click(within(dialog).getByRole("button", { name: "Забронировать" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Это время уже занято");
    expect(within(dialog).getByLabelText(/Название/)).toHaveValue("Планирование");
    expect(within(dialog).getByLabelText("Начало")).toHaveValue("10:00");
    expect(
      await within(dialog).findByText("Пересекается с бронью 10:30–11:30 «Другой пользователь»"),
    ).toBeInTheDocument();
    expect(within(schedule()).getByText("Другой пользователь")).toBeInTheDocument();
    expect(within(schedule()).getByText("Конфликт")).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText("Окончание"), "10:30");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Забронировать" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /Планирование, 10:00–10:30/ })).toBeInTheDocument();
  });

  it("handles a server-side race when the UI data is fresh", async () => {
    const user = renderPage();
    const dialog = await openNewBooking(user);
    controls.set({ raceNextWrite: true });

    await user.click(within(dialog).getByRole("button", { name: "Забронировать" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("это время занял другой пользователь");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(schedule()).getByText("Другой пользователь")).toBeInTheDocument();
  });

  it("keeps the form after a 500 and succeeds on retry", async () => {
    const user = renderPage();
    const dialog = await openNewBooking(user);
    await user.type(within(dialog).getByLabelText(/Название/), "Ретро");
    controls.set({ failNextRequest: true });

    await user.click(within(dialog).getByRole("button", { name: "Забронировать" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Введённые данные сохранены");
    expect(within(dialog).getByLabelText(/Название/)).toHaveValue("Ретро");

    await user.click(within(dialog).getByRole("button", { name: "Забронировать" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store.list(TODAY).some((b) => b.title === "Ретро")).toBe(true);
  });

  it("edits a booking without conflicting with itself, then deletes it", async () => {
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ }));
    const dialog = await screen.findByRole("dialog", { name: "Изменить бронь" });

    await user.selectOptions(within(dialog).getByLabelText("Окончание"), "10:30");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store.get("standup")?.end).toBe("10:30");

    await user.click(await screen.findByRole("button", { name: /Стендап, 09:00–10:30/ }));
    await user.click(await screen.findByRole("button", { name: "Удалить" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Удалить" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store.get("standup")).toBeUndefined();
    expect(await screen.findByText("На эту дату броней нет.")).toBeInTheDocument();
  });

  it("moves a booking to another date and follows it there", async () => {
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ }));
    const dialog = await screen.findByRole("dialog", { name: "Изменить бронь" });

    const date = within(dialog).getByLabelText("Дата");
    await user.clear(date);
    await user.type(date, "2030-01-16");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store.get("standup")).toMatchObject({ date: "2030-01-16", start: "09:00", end: "10:00" });
    expect(window.location.search).toBe("?date=2030-01-16");
    expect(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ })).toBeInTheDocument();
    expect(store.list(TODAY)).toHaveLength(0);
  });

  it("re-times the booking when the new date is busy at that time", async () => {
    store.insert({ date: "2030-01-16", start: "09:00", end: "10:00", title: "Занято" });
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ }));
    const dialog = await screen.findByRole("dialog", { name: "Изменить бронь" });

    const date = within(dialog).getByLabelText("Дата");
    await user.clear(date);
    await user.type(date, "2030-01-16");

    await waitFor(() => expect(within(dialog).getByLabelText("Начало")).toHaveValue("10:00"));
    expect(within(dialog).getByLabelText("Окончание")).toHaveValue("11:00");
  });

  it("navigates between dates with the browser back button", async () => {
    const user = renderPage();
    await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ });

    await user.click(screen.getByRole("button", { name: "Следующий день" }));
    expect(await screen.findByText("На эту дату броней нет.")).toBeInTheDocument();
    expect(window.location.search).toBe("?date=2030-01-16");

    window.history.back();
    expect(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("explains that a booking has started while its form was open", async () => {
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ }));
    const dialog = await screen.findByRole("dialog", { name: "Изменить бронь" });

    user.setNow(new Date(2030, 0, 15, 9, 15));
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await within(dialog).findByText("Бронь уже началась — её нельзя изменить")).toBeInTheDocument();
    expect(store.get("standup")?.end).toBe("10:00");
  });

  it("shows past dates read-only", async () => {
    window.history.replaceState(null, "", "/?date=2030-01-14");
    renderPage();

    expect(await screen.findByText(/Это прошедшая дата/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новая бронь" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Свободно/ })).not.toBeInTheDocument();
  });

  it("shows an error state with retry when loading fails", async () => {
    controls.set({ failNextRequest: true });
    const user = renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить бронирования");
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByRole("button", { name: /Стендап, 09:00–10:00/ })).toBeInTheDocument();
  });
});

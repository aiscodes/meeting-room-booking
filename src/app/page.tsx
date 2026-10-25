import { NowProvider } from "@/features/bookings/now";
import { MockGate } from "@/mocks/mock-gate";
import { BookingApp } from "./booking-app";

function AppLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm text-slate-500" role="status">
      Загрузка…
    </div>
  );
}

export default function Page() {
  return (
    <MockGate fallback={<AppLoading />}>
      <NowProvider>
        <BookingApp />
      </NowProvider>
    </MockGate>
  );
}

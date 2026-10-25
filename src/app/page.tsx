import { PageHeader } from "@/features/bookings/components/page-header";
import { ScheduleSkeleton } from "@/features/bookings/components/states";
import { NowProvider } from "@/features/bookings/now";
import { MockGate } from "@/mocks/mock-gate";
import { BookingApp } from "./booking-app";

// The header is static and prerendered; only the time-dependent schedule waits for the client.
export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:pt-10">
      <PageHeader />
      <MockGate fallback={<ScheduleSkeleton />}>
        <NowProvider>
          <BookingApp />
        </NowProvider>
      </MockGate>
    </main>
  );
}

import type { Ref, SelectHTMLAttributes } from "react";
import { controlClassName } from "@/components/ui/form-field";
import type { TimeOption } from "@/domain/booking";
import { formatMinutes } from "@/domain/messages";
import { MAX_DURATION } from "@/domain/time";

const HINTS: Record<NonNullable<TimeOption["reason"]>, string> = {
  past: "прошло",
  busy: "занято",
  too_long: `больше ${formatMinutes(MAX_DURATION)}`,
};

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: TimeOption[];
  ref?: Ref<HTMLSelectElement>;
};

export function TimeSelect({ options, ...props }: Props) {
  return (
    <select {...props} className={`${controlClassName} tabular-nums`}>
      <option value="" disabled>
        Выберите
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.reason ? `${o.value} — ${HINTS[o.reason]}` : o.value}
        </option>
      ))}
    </select>
  );
}

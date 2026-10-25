import { type ReactNode, useId } from "react";

export type ControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

type Props = {
  label: ReactNode;
  error?: string;
  /** Marks the control invalid when its message is rendered elsewhere (linked through `describedBy`). */
  invalid?: boolean;
  describedBy?: string;
  children: (control: ControlProps) => ReactNode;
};

export function FormField({ label, error, invalid, describedBy, children }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error || invalid ? true : undefined,
        "aria-describedby": [error && errorId, describedBy].filter(Boolean).join(" ") || undefined,
      })}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const controlClassName =
  "mt-1.5 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200 aria-invalid:border-red-500 sm:text-sm";

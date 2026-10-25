import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { Ref, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
  wrapperClassName?: string;
};

// The native arrow hugs the border in Chrome and differs in Safari, so it's drawn by hand.
export function Select({ className, wrapperClassName, children, ...props }: Props) {
  return (
    <div className={clsx("relative", wrapperClassName)}>
      <select {...props} className={clsx("w-full appearance-none pr-10", className)}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

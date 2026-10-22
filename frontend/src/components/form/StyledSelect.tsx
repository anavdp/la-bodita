import type { SelectHTMLAttributes } from "react";

import { pillField } from "./styles";

/**
 * A short, fixed list (status, side, gender...) stays a native select, so phones
 * keep their own wheel, but dressed as one of the planner's fields.
 */
export function StyledSelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${pillField} cursor-pointer appearance-none pr-11 ${className}`} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant"
      >
        ▾
      </span>
    </div>
  );
}

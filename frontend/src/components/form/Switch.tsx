interface SwitchProps {
  /** Read by screen readers; the row beside the switch usually says it to everyone else. */
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * An on/off toggle in the planner's look: an ink-outlined pill that fills sky
 * blue when on. A native checkbox underneath, so keyboards and forms just work.
 */
export function Switch({ label, checked, disabled = false, onChange }: SwitchProps) {
  return (
    <span className="relative inline-flex h-8 w-14 shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer h-8 w-14 cursor-pointer appearance-none rounded-full border-[2.5px] border-ink bg-cream transition-colors checked:bg-sky focus:outline-none focus-visible:ring-4 focus-visible:ring-sky/25 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[5px] top-[5px] h-[22px] w-[22px] rounded-full border-2 border-ink bg-cream-light transition-transform peer-checked:translate-x-6 peer-disabled:opacity-50 motion-reduce:transition-none"
      />
    </span>
  );
}

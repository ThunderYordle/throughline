import type { InputHTMLAttributes } from "react";
import { cx } from "./tokens";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  compact?: boolean;
}

export function TextInput({ compact = false, className, ...rest }: TextInputProps) {
  return (
    <input
      className={cx(
        "w-full rounded-ds border border-line bg-canvas/90 text-ink-primary placeholder:text-ink-muted transition-colors focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/15",
        compact ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
        className,
      )}
      {...rest}
    />
  );
}

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export function SearchInput({ value, onChange, onClear, className, ...rest }: SearchInputProps) {
  return (
    <div className={cx("relative min-w-0 flex-1", className)}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
      >
        <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.75 10.75 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-ds border border-line bg-canvas/90 pl-8 pr-14 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/15"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(""))}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[5px] border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary hover:border-line-strong hover:text-ink-primary"
        >
          Clear
        </button>
      )}
    </div>
  );
}

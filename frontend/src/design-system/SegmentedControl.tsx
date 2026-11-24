import type { ReactNode } from "react";
import { cx } from "./tokens";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "xs" | "sm";
  wrap?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  wrap = true,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        "inline-flex items-center gap-1 rounded-ds border border-line bg-canvas/80 p-1",
        wrap && "flex-wrap",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-colors duration-150",
              size === "xs" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
              active
                ? "bg-surface-raised text-ink-primary ring-1 ring-cyan-400/35"
                : "text-ink-muted hover:text-ink-primary",
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cx(
                  "font-mono text-[10px] tabular-nums",
                  active ? "text-accent-cyan" : "text-ink-muted/80",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

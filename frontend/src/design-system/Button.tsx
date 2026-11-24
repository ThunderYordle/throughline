import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cx } from "./tokens";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "blue" | "red" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-ds font-medium transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-status-good text-ink-inverse font-semibold shadow-sm hover:bg-emerald-400",
  accent: "bg-accent-cyan text-ink-inverse font-semibold shadow-sm hover:bg-cyan-300",
  secondary:
    "border border-line bg-surface-raised text-ink-primary hover:border-line-strong hover:bg-surface-overlay",
  ghost: "text-ink-secondary hover:bg-surface-raised hover:text-ink-primary",
  blue: "border border-sky-400/30 bg-sky-500/10 text-sky-200 hover:border-sky-400/50 hover:bg-sky-500/20",
  red: "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:border-rose-400/50 hover:bg-rose-500/20",
  danger: "border border-rose-500/35 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  mono?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "sm",
  mono = false,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE, VARIANTS[variant], SIZES[size], mono && "font-mono tabular-nums", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  mono?: boolean;
  children: ReactNode;
}

export function ButtonLink({
  variant = "secondary",
  size = "sm",
  mono = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(BASE, VARIANTS[variant], SIZES[size], mono && "font-mono tabular-nums", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

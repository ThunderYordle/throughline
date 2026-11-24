export const TOKENS = {
  surface: {
    canvas: "#06080d",
    surface: "#0b0f17",
    raised: "#111722",
    overlay: "#182030",
  },
  border: {
    subtle: "rgba(148, 163, 184, 0.10)",
    default: "rgba(148, 163, 184, 0.17)",
    strong: "rgba(148, 163, 184, 0.30)",
  },
  text: {
    primary: "#f1f5f9",
    secondary: "#a8b3c7",
    muted: "#64748b",
    inverse: "#05080f",
  },
  accent: {
    cyan: "#22d3ee",
  },
  side: {
    blue: "#38bdf8",
    red: "#fb7185",
  },
  status: {
    good: "#10b981",
    warn: "#f59e0b",
    bad: "#f43f5e",
    info: "#38bdf8",
    violet: "#a78bfa",
    orange: "#fb923c",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
} as const;

export interface TokenSwatch {
  name: string;
  cssVar: string;
  value: string;
  usage: string;
}

export interface TokenGroup {
  title: string;
  description: string;
  tokens: TokenSwatch[];
}

export const COLOR_GROUPS: TokenGroup[] = [
  {
    title: "Obsidian Surfaces",
    description: "Four strict depth tiers separate backdrop, primary panels, nested headers, and interactive overlays.",
    tokens: [
      { name: "Canvas", cssVar: "--tl-bg-canvas", value: TOKENS.surface.canvas, usage: "App viewport & inset troughs" },
      { name: "Surface", cssVar: "--tl-bg-surface", value: TOKENS.surface.surface, usage: "Primary panels, cards, sub-bar" },
      { name: "Raised", cssVar: "--tl-bg-raised", value: TOKENS.surface.raised, usage: "Panel headers, inputs, active tabs" },
      { name: "Overlay", cssVar: "--tl-bg-overlay", value: TOKENS.surface.overlay, usage: "Hover states, tooltips, menus" },
    ],
  },
  {
    title: "Typography & Hairlines",
    description: "High-contrast slate hierarchy paired with 1px translucent hairlines so data stays legible at density.",
    tokens: [
      { name: "Primary Ink", cssVar: "--tl-text-primary", value: TOKENS.text.primary, usage: "Titles, call headlines, KPIs" },
      { name: "Secondary Ink", cssVar: "--tl-text-secondary", value: TOKENS.text.secondary, usage: "Descriptions, evidence bullets" },
      { name: "Muted Ink", cssVar: "--tl-text-muted", value: TOKENS.text.muted, usage: "Eyebrows, timestamps, sample sizes" },
      { name: "Default Border", cssVar: "--tl-border-default", value: TOKENS.border.default, usage: "Card & panel outer 1px frames" },
    ],
  },
  {
    title: "Team & Command Accents",
    description: "Reserved strictly for Blue/Red team attribution and interactive Warroom focus states.",
    tokens: [
      { name: "Command Cyan", cssVar: "--tl-accent-cyan", value: TOKENS.accent.cyan, usage: "Active workflow step, focus rings" },
      { name: "Blue Side", cssVar: "--tl-side-blue", value: TOKENS.side.blue, usage: "Blue roster, structures, blue lead" },
      { name: "Red Side", cssVar: "--tl-side-red", value: TOKENS.side.red, usage: "Red roster, structures, red lead" },
    ],
  },
  {
    title: "Telemetry Semantics",
    description: "Consistent status meaning across plan calls, review verdicts, timeline pins, and backtest deltas.",
    tokens: [
      { name: "Good / Followed", cssVar: "--tl-status-good", value: TOKENS.status.good, usage: "Followed checks, positive gold, primary CTA" },
      { name: "Warn / Objective", cssVar: "--tl-status-warn", value: TOKENS.status.warn, usage: "Partly followed, objective calls, gold" },
      { name: "Bad / Missed", cssVar: "--tl-status-bad", value: TOKENS.status.bad, usage: "Missed calls, macro issues, negative delta" },
      { name: "Violet / Concede", cssVar: "--tl-status-violet", value: TOKENS.status.violet, usage: "Concede calls, void objectives" },
      { name: "Orange / Spike", cssVar: "--tl-status-orange", value: TOKENS.status.orange, usage: "Level-6 & item spike timers" },
    ],
  },
];

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

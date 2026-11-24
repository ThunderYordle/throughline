export type PrimaryNavId = "matches" | "draft" | "validation";
export type WorkflowStageId = "draft" | "plan" | "review" | "replay";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface NavContext {
  activeNav: PrimaryNavId;
  stage: WorkflowStageId | null;
  crumbs: BreadcrumbItem[];
  subtitle: string;
}

export const PRIMARY_NAV_ITEMS: { id: PrimaryNavId; label: string; to: string }[] = [
  { id: "matches", label: "Matches", to: "/" },
  { id: "draft", label: "Draft Builder", to: "/plan/new" },
  { id: "validation", label: "Validation", to: "/validation" },
];

export const WORKFLOW_STAGES: { id: WorkflowStageId; step: string; label: string }[] = [
  { id: "draft", step: "01", label: "Draft" },
  { id: "plan", step: "02", label: "Plan" },
  { id: "review", step: "03", label: "Review" },
  { id: "replay", step: "04", label: "Replay" },
];

export function resolveNavContext(pathname: string): NavContext {
  if (pathname === "/plan/new") {
    return {
      activeNav: "draft",
      stage: "draft",
      crumbs: [{ label: "Matches", to: "/" }, { label: "Draft Builder" }],
      subtitle: "Configure 10-champion draft matchup",
    };
  }
  if (pathname.startsWith("/plan/from-game/")) {
    return {
      activeNav: "matches",
      stage: "plan",
      crumbs: [{ label: "Matches", to: "/" }, { label: "Generating Plan" }],
      subtitle: "Computing empirical tempo & call checklist",
    };
  }
  if (pathname.startsWith("/plan/")) {
    return {
      activeNav: "matches",
      stage: "plan",
      crumbs: [{ label: "Matches", to: "/" }, { label: "Game Plan" }],
      subtitle: "Pre-game macro checklist & tempo curve",
    };
  }
  if (pathname.startsWith("/review/")) {
    return {
      activeNav: "matches",
      stage: "review",
      crumbs: [{ label: "Matches", to: "/" }, { label: "Post-Game Review" }],
      subtitle: "Plan adherence scoring & tactical clips",
    };
  }
  if (pathname.startsWith("/replay/")) {
    return {
      activeNav: "matches",
      stage: "replay",
      crumbs: [{ label: "Matches", to: "/" }, { label: "Tactical Replay" }],
      subtitle: "Full-game minimap, structures & live telemetry",
    };
  }
  if (pathname === "/validation") {
    return {
      activeNav: "validation",
      stage: null,
      crumbs: [{ label: "Matches", to: "/" }, { label: "Validation Backtest" }],
      subtitle: "Strict time-split empirical evaluation",
    };
  }
  return {
    activeNav: "matches",
    stage: null,
    crumbs: [{ label: "Matches" }],
    subtitle: "Pro match ledger & draft scouting desk",
  };
}

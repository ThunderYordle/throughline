import type { Plan } from "../types";
import { ROLES } from "../types";

export function planToText(plan: Plan): string {
  const ours = plan.draft.us === "blue" ? plan.draft.blue : plan.draft.red;
  const theirs = plan.draft.us === "blue" ? plan.draft.red : plan.draft.blue;
  const lines = [
    `**Game plan** (patch ${plan.draft.patch ?? "?"}, ${plan.scope_games} games)`,
    `Us: ${ROLES.map((role) => ours[role]).join(", ")}`,
    `Them: ${ROLES.map((role) => theirs[role]).join(", ")}`,
    "",
  ];
  for (const item of plan.items) {
    const games = item.evidence.length ? Math.min(...item.evidence.map((evidence) => evidence.games)) : 0;
    lines.push(`- ${item.text}${games ? ` (${games} games)` : ""}`);
  }
  return lines.join("\n");
}
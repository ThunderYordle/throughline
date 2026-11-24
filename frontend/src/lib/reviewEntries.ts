import type { CheckStatus, Plan, ReviewBody } from "../types";

export type Tone = "good" | "bad" | "neutral" | "na";

export interface ReviewEntry {
  id: string;
  kind: "check" | "moment";
  t: number;
  label: string;
  text: string;
  numbers?: string;
  tone: Tone;
  clip: [number, number];
  status?: CheckStatus;
}

const CHECK_TONE: Record<CheckStatus, Tone> = {
  followed: "good",
  partly: "neutral",
  not_followed: "bad",
  not_applicable: "na",
};

const MOMENT_LABEL: Record<string, string> = {
  objective_setup: "Objective setup",
  unused_advantage: "Advantage",
  cross_map_trade: "Cross-map trade",
  caught: "Caught out",
  gold_swing: "Gold swing",
};

export function reviewEntries(review: ReviewBody, plan?: Plan): ReviewEntry[] {
  const text = new Map(plan?.items.map((item) => [item.id, item.text]) ?? []);
  const checks: ReviewEntry[] = review.checks.map((check) => ({
    id: check.item_id,
    kind: "check",
    t: check.at,
    label: text.get(check.item_id) ?? check.item_id,
    text: check.numbers,
    numbers: check.numbers,
    tone: CHECK_TONE[check.status],
    clip: check.clip,
    status: check.status,
  }));
  const moments: ReviewEntry[] = review.moments.map((moment) => ({
    id: moment.id,
    kind: "moment",
    t: moment.t,
    label: MOMENT_LABEL[moment.kind] ?? moment.kind,
    text: moment.text,
    tone: moment.verdict,
    clip: moment.clip,
  }));
  const timed = [...checks, ...moments].filter((entry) => entry.tone !== "na").sort((a, b) => a.t - b.t);
  return [...timed, ...checks.filter((entry) => entry.tone === "na")];
}

export function summaryLine(review: ReviewBody): string {
  const { followed, partly, not_followed } = review.summary;
  const applicable = followed + partly + not_followed;
  return `Plan followed ${followed} of ${applicable}${partly ? ` (${partly} partly)` : ""}`;
}
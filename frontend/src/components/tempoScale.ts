import type { TempoPoint } from "../types";

export const CHART_SECONDS = 1800;
const GOLD_STEP = 250;

export function tempoScale(points: TempoPoint[], width: number, height: number) {
  const peak = Math.max(GOLD_STEP, ...points.map((point) => Math.abs(point.value)));
  const maxGold = Math.ceil(peak / GOLD_STEP) * GOLD_STEP;
  return {
    maxGold,
    x: (seconds: number) => (Math.min(seconds, CHART_SECONDS) / CHART_SECONDS) * width,
    y: (gold: number) => height / 2 - (gold / maxGold) * (height / 2),
  };
}
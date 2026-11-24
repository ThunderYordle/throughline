import { fmtTime } from "../lib/time";
import type { Plan } from "../types";
import { CHART_SECONDS, tempoScale } from "./tempoScale";

const W = 640;
const H = 180;

export function TempoChart({ plan }: { plan: Plan }) {
  const scale = tempoScale(plan.tempo, W, H);
  const path = [{ minute: 0, value: 0 }, ...plan.tempo]
    .map((point, index) => `${index === 0 ? "M" : "L"}${scale.x(point.minute * 60).toFixed(1)},${scale.y(point.value).toFixed(1)}`)
    .join(" ");
  const marks = plan.items.flatMap((item) =>
    item.type === "spike"
      ? [{ t: item.at, label: `${item.enemy_champion} ${item.kind === "level6" ? "6" : "item"}` }]
      : item.type === "objective" || item.type === "concede"
        ? [{ t: item.spawn_at, label: item.objective }]
        : [],
  );
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label="Draft tempo from 0 to 30 minutes">
        {plan.windows.map((window) => (
          <rect
            key={window.start}
            x={scale.x(window.start)}
            y={0}
            width={scale.x(window.end) - scale.x(window.start)}
            height={H}
            className={window.owner === "us" ? "fill-emerald-500/15" : "fill-rose-500/15"}
          />
        ))}
        <line x1={0} x2={W} y1={scale.y(0)} y2={scale.y(0)} className="stroke-zinc-700" />
        <path d={path} fill="none" className="stroke-zinc-100" strokeWidth={2} />
        {marks.map((mark) => (
          <g key={`${mark.t}-${mark.label}`}>
            <line
              x1={scale.x(mark.t)}
              x2={scale.x(mark.t)}
              y1={0}
              y2={H}
              className="stroke-zinc-600"
              strokeDasharray="3 3"
            />
            <text x={scale.x(mark.t) + 3} y={12} className="fill-zinc-400 text-[10px]">
              {mark.label}
            </text>
          </g>
        ))}
        {[0, 600, 1200, CHART_SECONDS].map((time) => (
          <text key={time} x={Math.min(scale.x(time), W - 24)} y={H + 16} className="fill-zinc-500 text-[10px]">
            {fmtTime(time)}
          </text>
        ))}
        <text x={4} y={scale.y(scale.maxGold) + 12} className="fill-zinc-500 text-[10px]">
          +{scale.maxGold} us
        </text>
        <text x={4} y={scale.y(-scale.maxGold) - 4} className="fill-zinc-500 text-[10px]">
          -{scale.maxGold} them
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-zinc-500">
        Expected gold difference from the draft alone. Green: our window. Red: theirs.
      </figcaption>
    </figure>
  );
}
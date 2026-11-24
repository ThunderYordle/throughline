import { fmtTime } from "../lib/time";
import type { ReviewEntry } from "../lib/reviewEntries";

const W = 640;
const H = 120;
const TONE_FILL = { good: "fill-emerald-400", bad: "fill-rose-400", neutral: "fill-zinc-300", na: "fill-zinc-600" } as const;

interface Props {
  gold: [number, number][];
  duration: number;
  entries: ReviewEntry[];
  selected?: string;
  onSelect: (id: string) => void;
}

export function GameTimeline({ gold, duration, entries, selected, onSelect }: Props) {
  const peak = Math.max(1000, ...gold.map(([, value]) => Math.abs(value)));
  const x = (t: number) => (t / Math.max(duration, 1)) * W;
  const y = (value: number) => H / 2 - (value / peak) * (H / 2 - 8);
  const path = gold.map(([t, value], index) => `${index ? "L" : "M"}${x(t).toFixed(1)},${y(value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Gold difference over the game">
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-zinc-700" />
      <path d={path} fill="none" className="stroke-zinc-200" strokeWidth={1.5} />
      {entries.filter((entry) => entry.tone !== "na").map((entry) => (
        <circle
          key={entry.id}
          cx={x(entry.t)}
          cy={H - 6}
          r={selected === entry.id ? 6 : 4}
          className={`${TONE_FILL[entry.tone]} cursor-pointer`}
          onClick={() => onSelect(entry.id)}
        >
          <title>{`${fmtTime(entry.t)} ${entry.label}`}</title>
        </circle>
      ))}
      {[0, duration / 2, duration].map((t) => (
        <text key={t} x={Math.min(x(t), W - 28)} y={H + 14} className="fill-zinc-500 text-[10px]">
          {fmtTime(t)}
        </text>
      ))}
    </svg>
  );
}
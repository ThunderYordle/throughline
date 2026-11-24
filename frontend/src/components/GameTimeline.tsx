import { useId } from "react";
import { Panel, PanelBody, PanelHeader, TOKENS } from "../design-system";
import type { ReviewEntry } from "../lib/reviewEntries";
import { fmtTime } from "../lib/time";
import { fmtGoldSigned } from "../replay/state";

const W = 720;
const H = 132;
const PAD_L = 46;
const PAD_R = 20;
const PAD_T = 14;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - 20;

const TONE_COLOR = {
  good: TOKENS.status.good,
  bad: TOKENS.status.bad,
  neutral: TOKENS.status.warn,
  na: TOKENS.text.muted,
} as const;

interface Props {
  gold: [number, number][];
  duration: number;
  entries: ReviewEntry[];
  selected?: string;
  clipRange?: [number, number];
  onSelect: (id: string) => void;
}

export function GameTimeline({ gold, duration, entries, selected, clipRange, onSelect }: Props) {
  const uid = useId().replace(/:/g, "");
  const peak = Math.max(1000, ...gold.map(([, value]) => Math.abs(value)));
  const maxT = Math.max(duration, 1);
  const x = (t: number) => PAD_L + (t / maxT) * INNER_W;
  const zeroY = PAD_T + INNER_H / 2;
  const y = (value: number) => zeroY - (value / peak) * (INNER_H / 2 - 4);
  const linePath = gold
    .map(([t, value], index) => `${index ? "L" : "M"}${x(t).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ");
  const lastX = gold.length ? x(gold[gold.length - 1][0]) : PAD_L;
  const areaPath = gold.length
    ? `${linePath} L${lastX.toFixed(1)},${zeroY.toFixed(1)} L${x(gold[0][0]).toFixed(1)},${zeroY.toFixed(1)} Z`
    : "";

  const timedEntries = entries.filter((entry) => entry.tone !== "na");
  const ticks = [0, duration * 0.25, duration * 0.5, duration * 0.75, duration];

  return (
    <Panel>
      <PanelHeader
        title="Gold difference & key moments"
        description="Click any pin to focus that entry and loop its tactical map clip."
        actions={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-good" />
              Good / Followed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-warn" />
              Partly / Neutral
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-bad" />
              Issue / Missed
            </span>
          </div>
        }
      />

      <PanelBody className="py-3">
        <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" role="img" aria-label="Gold difference over the game">
          <defs>
            <linearGradient id={`${uid}-pos`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOKENS.status.good} stopOpacity="0.34" />
              <stop offset="100%" stopColor={TOKENS.status.good} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${uid}-neg`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={TOKENS.status.bad} stopOpacity="0.34" />
              <stop offset="100%" stopColor={TOKENS.status.bad} stopOpacity="0.02" />
            </linearGradient>
            <clipPath id={`${uid}-above`}>
              <rect x={PAD_L} y={PAD_T} width={INNER_W} height={INNER_H / 2} />
            </clipPath>
            <clipPath id={`${uid}-below`}>
              <rect x={PAD_L} y={zeroY} width={INNER_W} height={INNER_H / 2} />
            </clipPath>
          </defs>

          {clipRange && (
            <rect
              x={x(Math.max(0, clipRange[0]))}
              y={PAD_T - 2}
              width={Math.max(4, x(Math.min(maxT, clipRange[1])) - x(Math.max(0, clipRange[0])))}
              height={INNER_H + 4}
              rx={3}
              fill="rgba(34, 211, 238, 0.14)"
              stroke="rgba(34, 211, 238, 0.45)"
              strokeWidth={1}
            />
          )}

          <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T} y2={PAD_T} stroke={TOKENS.border.subtle} strokeDasharray="3 4" />
          <line x1={PAD_L} x2={W - PAD_R} y1={zeroY} y2={zeroY} stroke={TOKENS.border.strong} />
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + INNER_H}
            y2={PAD_T + INNER_H}
            stroke={TOKENS.border.subtle}
            strokeDasharray="3 4"
          />

          {areaPath && (
            <>
              <path d={areaPath} fill={`url(#${uid}-pos)`} clipPath={`url(#${uid}-above)`} />
              <path d={areaPath} fill={`url(#${uid}-neg)`} clipPath={`url(#${uid}-below)`} />
            </>
          )}
          <path d={linePath} fill="none" stroke={TOKENS.text.primary} strokeWidth={1.8} strokeLinejoin="round" />

          {timedEntries.map((entry) => {
            const ex = x(entry.t);
            const isSelected = selected === entry.id;
            return (
              <g key={entry.id} onClick={() => onSelect(entry.id)} className="cursor-pointer">
                {isSelected && (
                  <line
                    x1={ex}
                    x2={ex}
                    y1={PAD_T}
                    y2={H - 4}
                    stroke={TOKENS.accent.cyan}
                    strokeOpacity={0.65}
                    strokeDasharray="2 2"
                  />
                )}
                <circle
                  cx={ex}
                  cy={H - 4}
                  r={isSelected ? 6.5 : 4.2}
                  fill={TONE_COLOR[entry.tone]}
                  stroke={TOKENS.surface.canvas}
                  strokeWidth={isSelected ? 2 : 1.2}
                >
                  <title>{`${fmtTime(entry.t)} ${entry.label}`}</title>
                </circle>
              </g>
            );
          })}

          <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end" fill={TOKENS.status.good} className="font-mono text-[9.5px]">
            {fmtGoldSigned(peak)}
          </text>
          <text x={PAD_L - 6} y={zeroY + 3} textAnchor="end" fill={TOKENS.text.muted} className="font-mono text-[9.5px]">
            0
          </text>
          <text
            x={PAD_L - 6}
            y={PAD_T + INNER_H + 3}
            textAnchor="end"
            fill={TOKENS.status.bad}
            className="font-mono text-[9.5px]"
          >
            {fmtGoldSigned(-peak)}
          </text>

          {ticks.map((t, index) => (
            <text
              key={index}
              x={x(t)}
              y={H + 13}
              textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"}
              fill={TOKENS.text.muted}
              className="font-mono text-[9.5px]"
            >
              {fmtTime(t)}
            </text>
          ))}
        </svg>
      </PanelBody>
    </Panel>
  );
}

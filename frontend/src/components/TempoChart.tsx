import { useId, useState } from "react";
import { Panel, PanelBody, PanelHeader, TOKENS } from "../design-system";
import { fmtTime } from "../lib/time";
import type { Plan } from "../types";
import { CHART_SECONDS, tempoScale } from "./tempoScale";

const W = 680;
const H = 190;
const PAD_L = 44;
const PAD_R = 26;
const PAD_T = 22;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T;

export function TempoChart({ plan }: { plan: Plan }) {
  const uid = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const scale = tempoScale(plan.tempo, INNER_W, INNER_H);
  const sx = (t: number) => PAD_L + scale.x(t);
  const sy = (v: number) => PAD_T + scale.y(v);
  const zeroY = sy(0);

  const points = [{ minute: 0, value: 0, games: plan.scope_games }, ...plan.tempo];
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${sx(point.minute * 60).toFixed(1)},${sy(point.value).toFixed(1)}`)
    .join(" ");
  const lastX = sx(points[points.length - 1].minute * 60);
  const areaPath = `${linePath} L${lastX.toFixed(1)},${zeroY.toFixed(1)} L${sx(0).toFixed(1)},${zeroY.toFixed(1)} Z`;

  const marks = plan.items.flatMap((item) =>
    item.type === "spike"
      ? [{ t: item.at, label: `${item.enemy_champion} ${item.kind === "level6" ? "6" : "item"}` }]
      : item.type === "objective" || item.type === "concede"
        ? [{ t: item.spawn_at, label: item.objective }]
        : [],
  );

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <Panel as="figure" className="h-full w-full">
      <PanelHeader
        title="Expected draft tempo (0-30 min)"
        description="Expected gold difference from the draft alone, shrunk toward zero for small samples."
        actions={
          <div className="flex items-center gap-3 text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/35 ring-1 ring-emerald-400/50" />
              Our window
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/35 ring-1 ring-rose-400/50" />
              Their window
            </span>
          </div>
        }
      />

      <PanelBody className="pt-3">
        <svg viewBox={`0 0 ${W} ${H + 26}`} className="w-full" role="img" aria-label="Draft tempo from 0 to 30 minutes">
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
              <rect x={PAD_L} y={PAD_T} width={INNER_W} height={Math.max(0, zeroY - PAD_T)} />
            </clipPath>
            <clipPath id={`${uid}-below`}>
              <rect x={PAD_L} y={zeroY} width={INNER_W} height={Math.max(0, H - zeroY)} />
            </clipPath>
          </defs>

          {plan.windows.map((window) => (
            <rect
              key={window.start}
              x={sx(window.start)}
              y={PAD_T}
              width={Math.max(0, sx(window.end) - sx(window.start))}
              height={INNER_H}
              rx={3}
              fill={window.owner === "us" ? "rgba(16, 185, 129, 0.14)" : "rgba(244, 63, 94, 0.14)"}
              stroke={window.owner === "us" ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"}
              strokeWidth={0.75}
            />
          ))}

          {[-scale.maxGold, -scale.maxGold / 2, 0, scale.maxGold / 2, scale.maxGold].map((val) => (
            <line
              key={val}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={sy(val)}
              y2={sy(val)}
              stroke={val === 0 ? TOKENS.border.strong : TOKENS.border.subtle}
              strokeDasharray={val === 0 ? undefined : "3 4"}
            />
          ))}

          <path d={areaPath} fill={`url(#${uid}-pos)`} clipPath={`url(#${uid}-above)`} />
          <path d={areaPath} fill={`url(#${uid}-neg)`} clipPath={`url(#${uid}-below)`} />

          <path d={linePath} fill="none" stroke={TOKENS.text.primary} strokeWidth={2.2} strokeLinejoin="round" />

          {marks.map((mark, idx) => {
            const mx = sx(mark.t);
            const yOffset = idx % 2 === 0 ? 11 : 20;
            return (
              <g key={`${mark.t}-${mark.label}`}>
                <line
                  x1={mx}
                  x2={mx}
                  y1={PAD_T}
                  y2={H}
                  stroke={TOKENS.border.strong}
                  strokeDasharray="3 3"
                />
                <text
                  x={Math.min(mx + 3, W - PAD_R - 42)}
                  y={yOffset}
                  fill={TOKENS.text.secondary}
                  className="font-mono text-[9.5px]"
                >
                  {mark.label}
                </text>
              </g>
            );
          })}

          {points.map((point, index) => {
            const px = sx(point.minute * 60);
            const py = sy(point.value);
            const active = hoverIdx === index;
            return (
              <g
                key={point.minute}
                onMouseEnter={() => setHoverIdx(index)}
                onMouseLeave={() => setHoverIdx(null)}
                className="cursor-pointer"
              >
                <circle cx={px} cy={py} r={10} fill="transparent" />
                <circle
                  cx={px}
                  cy={py}
                  r={active ? 4.5 : 2.5}
                  fill={
                    point.value > 0
                      ? TOKENS.status.good
                      : point.value < 0
                        ? TOKENS.status.bad
                        : TOKENS.text.primary
                  }
                  stroke={TOKENS.surface.canvas}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {hovered && hoverIdx !== null && (
            <g>
              <rect
                x={Math.min(Math.max(PAD_L, sx(hovered.minute * 60) - 52), W - PAD_R - 104)}
                y={Math.max(PAD_T + 2, sy(hovered.value) - 28)}
                width={104}
                height={20}
                rx={5}
                fill={TOKENS.surface.canvas}
                stroke={TOKENS.border.strong}
              />
              <text
                x={Math.min(Math.max(PAD_L + 52, sx(hovered.minute * 60)), W - PAD_R - 52)}
                y={Math.max(PAD_T + 15, sy(hovered.value) - 15)}
                textAnchor="middle"
                fill={TOKENS.text.primary}
                className="font-mono text-[10px]"
              >
                {fmtTime(hovered.minute * 60)} · {hovered.value >= 0 ? "+" : ""}
                {Math.round(hovered.value)}g
              </text>
            </g>
          )}

          {[0, 600, 1200, CHART_SECONDS].map((time) => (
            <text
              key={time}
              x={sx(time)}
              y={H + 17}
              textAnchor={time === 0 ? "start" : time === CHART_SECONDS ? "end" : "middle"}
              fill={TOKENS.text.muted}
              className="font-mono text-[10px]"
            >
              {fmtTime(time)}
            </text>
          ))}

          <text x={PAD_L - 6} y={sy(scale.maxGold) + 3} textAnchor="end" fill={TOKENS.status.good} className="font-mono text-[9.5px]">
            +{scale.maxGold}
          </text>
          <text x={PAD_L - 6} y={zeroY + 3} textAnchor="end" fill={TOKENS.text.muted} className="font-mono text-[9.5px]">
            0
          </text>
          <text x={PAD_L - 6} y={sy(-scale.maxGold) + 3} textAnchor="end" fill={TOKENS.status.bad} className="font-mono text-[9.5px]">
            -{scale.maxGold}
          </text>
        </svg>
      </PanelBody>
    </Panel>
  );
}

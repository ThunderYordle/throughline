import { useDdragon } from "../lib/ddragon";
import { ROLES, type Draft, type Side } from "../types";

const SHORT_ROLE: Record<(typeof ROLES)[number], string> = {
  top: "TOP",
  jungle: "JGL",
  mid: "MID",
  bot: "BOT",
  support: "SUP",
};

export function DraftStrip({ draft }: { draft: Draft }) {
  const { iconFor } = useDdragon();
  const row = (side: Side) => {
    const isUs = draft.us === side;
    const ring = side === "blue" ? "ring-side-blue/50" : "ring-side-red/50";
    return (
      <div
        className={`flex items-center gap-3 rounded-ds border px-3 py-2 ${
          side === "blue"
            ? "border-sky-400/25 bg-sky-500/[0.06]"
            : "border-rose-400/25 bg-rose-500/[0.06]"
        }`}
      >
        <div className="w-12 shrink-0">
          <div className={`font-display text-xs font-semibold ${side === "blue" ? "text-side-blue" : "text-side-red"}`}>
            {isUs ? "Us" : "Them"}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">{side}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {ROLES.map((role) => {
            const champion = draft[side][role];
            const icon = iconFor(champion);
            return (
              <div key={role} className="flex flex-col items-center gap-0.5">
                {icon ? (
                  <img
                    src={icon}
                    alt={champion}
                    title={`${role.toUpperCase()}: ${champion}`}
                    className={`h-8 w-8 rounded-[6px] ring-1 ${ring}`}
                  />
                ) : (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface-raised font-mono text-[10px] text-ink-secondary ring-1 ${ring}`}
                  >
                    {champion.slice(0, 3)}
                  </span>
                )}
                <span className="font-mono text-[9px] text-ink-muted">{SHORT_ROLE[role]}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      {row("blue")}
      {row("red")}
    </div>
  );
}

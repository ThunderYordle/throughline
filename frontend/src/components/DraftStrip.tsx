import { useDdragon } from "../lib/ddragon";
import { ROLES, type Draft, type Side } from "../types";

export function DraftStrip({ draft }: { draft: Draft }) {
  const { iconFor } = useDdragon();
  const row = (side: Side) => (
    <div className={`flex items-center gap-2 ${draft.us === side ? "" : "opacity-80"}`}>
      <span className={`w-12 text-xs font-medium ${side === "blue" ? "text-blue-side" : "text-red-side"}`}>
        {draft.us === side ? "Us" : "Them"}
      </span>
      {ROLES.map((role) => {
        const champion = draft[side][role];
        const icon = iconFor(champion);
        return icon ? (
          <img key={role} src={icon} alt={champion} title={`${role}: ${champion}`} className="h-10 w-10 rounded" />
        ) : (
          <span key={role} className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-[10px]">
            {champion}
          </span>
        );
      })}
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      {row("blue")}
      {row("red")}
    </div>
  );
}
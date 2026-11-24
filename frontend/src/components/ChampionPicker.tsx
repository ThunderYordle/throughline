import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useDdragon } from "../lib/ddragon";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  side?: "blue" | "red";
}

export function ChampionPicker({ label, value, onChange, side }: Props) {
  const { data = [] } = useQuery({ queryKey: ["champions"], queryFn: api.champions, staleTime: Infinity });
  const { iconFor } = useDdragon();
  const icon = value ? iconFor(value) : undefined;
  const ring = side === "blue" ? "ring-side-blue/60" : side === "red" ? "ring-side-red/60" : "ring-line";
  const borderFocus =
    side === "blue"
      ? "focus-within:border-sky-400/60"
      : side === "red"
        ? "focus-within:border-rose-400/60"
        : "focus-within:border-cyan-400/60";

  return (
    <label
      className={`flex items-center gap-3 rounded-ds border border-line bg-canvas/90 px-3 py-2 transition-colors ${borderFocus}`}
    >
      <span className="w-14 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted md:hidden">
        {label}
      </span>
      {icon ? (
        <img src={icon} alt="" className={`h-8 w-8 shrink-0 rounded-[6px] ring-1 ${ring}`} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-dashed border-line bg-surface-raised font-mono text-[10px] text-ink-muted">
          ?
        </span>
      )}
      <input
        list="champion-list"
        value={value}
        placeholder={`Pick ${label}...`}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none"
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onChange("");
          }}
          className="rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] text-ink-muted hover:bg-surface-raised hover:text-ink-primary"
          aria-label={`Clear ${label}`}
        >
          ×
        </button>
      )}
      <datalist id="champion-list">
        {data.map((champion) => (
          <option key={champion.name} value={champion.name}>{`${champion.games} games`}</option>
        ))}
      </datalist>
    </label>
  );
}

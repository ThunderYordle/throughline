import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useDdragon } from "../lib/ddragon";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ChampionPicker({ label, value, onChange }: Props) {
  const { data = [] } = useQuery({ queryKey: ["champions"], queryFn: api.champions, staleTime: Infinity });
  const { iconFor } = useDdragon();
  const icon = value ? iconFor(value) : undefined;
  return (
    <label className="flex items-center gap-2">
      <span className="w-16 text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      {icon ? <img src={icon} alt="" className="h-8 w-8 rounded" /> : <span className="h-8 w-8 rounded bg-zinc-800" />}
      <input
        list="champion-list"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded bg-zinc-900 px-2 py-1"
        aria-label={label}
      />
      <datalist id="champion-list">
        {data.map((champion) => (
          <option key={champion.name} value={champion.name}>{`${champion.games} games`}</option>
        ))}
      </datalist>
    </label>
  );
}
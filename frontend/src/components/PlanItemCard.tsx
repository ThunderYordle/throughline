import { useState } from "react";
import type { PlanItem } from "../types";

const LABEL: Record<PlanItem["type"], string> = {
  objective: "Objective",
  concede: "Concede",
  lane: "Lane",
  window: "Window",
  spike: "Spike",
  side: "Jungle side",
};

interface Props {
  item: PlanItem;
  editable: boolean;
  onChange: (item: PlanItem) => void;
  onRemove: () => void;
}

export function PlanItemCard({ item, editable, onChange, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const games = item.evidence.length ? Math.min(...item.evidence.map((evidence) => evidence.games)) : 0;
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{LABEL[item.type]}</span>
        <span className="text-xs tabular-nums text-zinc-500">{games} games</span>
      </div>
      {editing ? (
        <div className="mt-2 flex gap-2">
          <input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded bg-zinc-950 px-2 py-1" />
          <button
            type="button"
            className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-900"
            onClick={() => {
              onChange({ ...item, text, origin: "edited" });
              setEditing(false);
            }}
          >
            Save
          </button>
        </div>
      ) : (
        <p className="mt-2 font-medium">{item.text}</p>
      )}
      <ul className="mt-2 space-y-1 text-sm text-zinc-400">
        {item.evidence.map((evidence) => (
          <li key={evidence.text}>
            {evidence.text} <span className="text-zinc-600">({evidence.games} games)</span>
          </li>
        ))}
      </ul>
      {item.origin !== "generated" && <p className="mt-2 text-xs text-amber-400">Edited by the coach</p>}
      {editable && !editing && (
        <div className="mt-3 flex gap-3 text-sm text-zinc-400">
          <button type="button" className="hover:text-zinc-100" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="hover:text-rose-300" onClick={onRemove}>
            Remove
          </button>
        </div>
      )}
    </li>
  );
}
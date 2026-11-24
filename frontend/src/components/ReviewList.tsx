import { useState } from "react";
import { fmtTime } from "../lib/time";
import type { ReviewEntry } from "../lib/reviewEntries";
import type { EntryState } from "../types";

const BADGE = {
  good: "bg-emerald-500/15 text-emerald-300",
  bad: "bg-rose-500/15 text-rose-300",
  neutral: "bg-zinc-500/15 text-zinc-300",
  na: "bg-zinc-800 text-zinc-500",
} as const;
const STATUS_TEXT = { followed: "Followed", partly: "Partly", not_followed: "Not followed", not_applicable: "Not applicable" };

interface Props {
  entries: ReviewEntry[];
  states: Record<string, EntryState>;
  selected?: string;
  editable: boolean;
  onSelect: (id: string) => void;
  onState: (id: string, state: EntryState) => void;
}

export function ReviewList({ entries, states, selected, editable, onSelect, onState }: Props) {
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const state = states[entry.id] ?? { status: null, note: "" };
        const note = draftNote[entry.id] ?? state.note;
        return (
          <li
            key={entry.id}
            className={`rounded-lg border p-3 ${selected === entry.id ? "border-zinc-400" : "border-zinc-800"} ${state.status === "dismissed" ? "opacity-50" : ""}`}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(entry.id)} disabled={entry.tone === "na"}>
              <div className="flex items-center gap-2 text-xs">
                <span className="tabular-nums text-zinc-500">{entry.tone === "na" ? "--:--" : fmtTime(entry.t)}</span>
                <span className={`rounded px-1.5 py-0.5 ${BADGE[entry.tone]}`}>
                  {entry.status ? STATUS_TEXT[entry.status] : entry.tone === "good" ? "Good" : entry.tone === "bad" ? "Bad" : "Neutral"}
                </span>
                <span className="text-zinc-400">{entry.kind === "check" ? "Plan" : entry.label}</span>
              </div>
              {entry.kind === "check" && <p className="mt-1 font-medium">{entry.label}</p>}
              <p className="mt-1 text-sm text-zinc-300">{entry.text}</p>
            </button>
            {(editable || state.note) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {editable && (["confirmed", "dismissed"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`rounded px-2 py-0.5 ${state.status === status ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800"}`}
                    onClick={() => onState(entry.id, { status: state.status === status ? null : status, note: state.note })}
                  >
                    {status === "confirmed" ? "Confirm" : "Dismiss"}
                  </button>
                ))}
                {editable ? (
                  <input
                    value={note}
                    placeholder="Note for the players"
                    onChange={(event) => setDraftNote({ ...draftNote, [entry.id]: event.target.value })}
                    onBlur={() => note !== state.note && onState(entry.id, { status: state.status, note })}
                    className="min-w-0 flex-1 rounded bg-zinc-950 px-2 py-0.5"
                  />
                ) : (
                  <p className="text-zinc-400">Coach: {state.note}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
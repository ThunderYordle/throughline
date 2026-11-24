import { useState } from "react";
import {
  Badge,
  Button,
  Panel,
  SegmentedControl,
  TextInput,
  type BadgeTone,
  type PanelAccent,
} from "../design-system";
import type { ReviewEntry } from "../lib/reviewEntries";
import { fmtTime } from "../lib/time";
import type { EntryState } from "../types";

const TONE_MAP: Record<ReviewEntry["tone"], { badge: BadgeTone; accent: PanelAccent }> = {
  good: { badge: "good", accent: "good" },
  bad: { badge: "bad", accent: "bad" },
  neutral: { badge: "warn", accent: "warn" },
  na: { badge: "neutral", accent: "none" },
};

const STATUS_TEXT = {
  followed: "Followed",
  partly: "Partly",
  not_followed: "Not followed",
  not_applicable: "Not applicable",
};

type Filter = "all" | "check" | "moment" | "bad";

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
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: entries.length,
    check: entries.filter((e) => e.kind === "check").length,
    moment: entries.filter((e) => e.kind === "moment").length,
    bad: entries.filter((e) => e.tone === "bad").length,
  };

  const visible = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "check") return entry.kind === "check";
    if (filter === "moment") return entry.kind === "moment";
    return entry.tone === "bad";
  });

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          ariaLabel="Filter review entries"
          size="xs"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "check", label: "Plan checks", count: counts.check },
            { value: "moment", label: "Moments", count: counts.moment },
            { value: "bad", label: "Issues", count: counts.bad },
          ]}
        />
        <span className="font-mono text-[11px] tabular-nums text-ink-muted">{visible.length} shown</span>
      </div>

      <ul className="min-w-0 space-y-2.5">
        {visible.map((entry) => {
          const state = states[entry.id] ?? { status: null, note: "" };
          const note = draftNote[entry.id] ?? state.note;
          const isSelected = selected === entry.id;
          const mapped = TONE_MAP[entry.tone];
          return (
            <Panel
              key={entry.id}
              as="li"
              accent={mapped.accent}
              tone={isSelected ? "raised" : "default"}
              interactive
              className={`p-3.5 ${isSelected ? "ring-1 ring-cyan-400/50" : ""} ${
                state.status === "dismissed" ? "opacity-50" : ""
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelect(entry.id)}
                disabled={entry.tone === "na"}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono tabular-nums text-ink-muted">
                    {entry.tone === "na" ? "--:--" : fmtTime(entry.t)}
                  </span>
                  <Badge tone={mapped.badge} pill={false}>
                    {entry.status
                      ? STATUS_TEXT[entry.status]
                      : entry.tone === "good"
                        ? "Good"
                        : entry.tone === "bad"
                          ? "Bad"
                          : "Neutral"}
                  </Badge>
                  <span className="text-ink-muted">{entry.kind === "check" ? "Plan check" : entry.label}</span>
                  {isSelected && entry.tone !== "na" && (
                    <Badge tone="cyan" mono className="ml-auto">
                      On map
                    </Badge>
                  )}
                </div>
                {entry.kind === "check" && (
                  <p className="mt-1.5 font-display text-sm font-semibold text-ink-primary">{entry.label}</p>
                )}
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{entry.text}</p>
              </button>

              {(editable || state.note) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-2.5 text-xs">
                  {editable && (
                    <>
                      <Button
                        size="xs"
                        variant={state.status === "confirmed" ? "primary" : "secondary"}
                        onClick={() =>
                          onState(entry.id, {
                            status: state.status === "confirmed" ? null : "confirmed",
                            note: state.note,
                          })
                        }
                      >
                        Confirm
                      </Button>
                      <Button
                        size="xs"
                        variant={state.status === "dismissed" ? "accent" : "secondary"}
                        onClick={() =>
                          onState(entry.id, {
                            status: state.status === "dismissed" ? null : "dismissed",
                            note: state.note,
                          })
                        }
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                  {editable ? (
                    <TextInput
                      compact
                      value={note}
                      placeholder="Note for the players"
                      onChange={(event) => setDraftNote({ ...draftNote, [entry.id]: event.target.value })}
                      onBlur={() => note !== state.note && onState(entry.id, { status: state.status, note })}
                      className="min-w-0 flex-1"
                    />
                  ) : (
                    <p className="text-ink-secondary">
                      <span className="font-semibold text-accent-cyan">Coach:</span> {state.note}
                    </p>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </ul>
    </div>
  );
}

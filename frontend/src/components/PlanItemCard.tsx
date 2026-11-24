import { useState } from "react";
import { Badge, Button, Panel, PanelBody, PanelFooter, TextInput, type BadgeTone, type PanelAccent } from "../design-system";
import type { PlanItem } from "../types";

const LABEL: Record<PlanItem["type"], string> = {
  objective: "Objective",
  concede: "Concede",
  lane: "Lane",
  window: "Window",
  spike: "Spike",
  side: "Jungle side",
};

function toneFor(item: PlanItem): { accent: PanelAccent; badge: BadgeTone } {
  switch (item.type) {
    case "objective":
      return { accent: "warn", badge: "warn" };
    case "concede":
      return { accent: "violet", badge: "violet" };
    case "lane":
      return { accent: "blue", badge: "blue" };
    case "window":
      return item.stance === "force" ? { accent: "good", badge: "good" } : { accent: "bad", badge: "bad" };
    case "spike":
      return { accent: "orange", badge: "orange" };
    case "side":
      return { accent: "cyan", badge: "cyan" };
  }
}

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
  const { accent, badge } = toneFor(item);

  return (
    <Panel as="li" accent={accent} interactive>
      <PanelBody className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badge} pill={false}>
              {LABEL[item.type]}
            </Badge>
            {item.origin !== "generated" && <Badge tone="warn">Edited by coach</Badge>}
          </div>
          <Badge tone="neutral" mono>
            {games} games
          </Badge>
        </div>

        {editing ? (
          <div className="flex flex-wrap gap-2">
            <TextInput
              compact
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-w-0 flex-1"
            />
            <Button
              variant="accent"
              size="xs"
              onClick={() => {
                onChange({ ...item, text, origin: "edited" });
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setText(item.text);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <p className="font-display text-base font-semibold leading-snug text-ink-primary">{item.text}</p>
        )}

        <ul className="space-y-1 border-t border-line-subtle pt-2.5">
          {item.evidence.map((evidence) => (
            <li
              key={evidence.text}
              className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-secondary"
            >
              <span>{evidence.text}</span>
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">({evidence.games} games)</span>
            </li>
          ))}
        </ul>
      </PanelBody>

      {editable && !editing && (
        <PanelFooter className="py-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Coach controls</span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="ghost" size="xs" className="hover:text-rose-300" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </PanelFooter>
      )}
    </Panel>
  );
}

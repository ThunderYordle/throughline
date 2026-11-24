import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { ChampionPicker } from "../components/ChampionPicker";
import {
  Badge,
  Button,
  Callout,
  PageContainer,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  SegmentedControl,
} from "../design-system";
import { saveToken } from "../lib/tokens";
import { ROLES, type Role, type Side } from "../types";

const empty = (): Record<Role, string> => ({ top: "", jungle: "", mid: "", bot: "", support: "" });

const ROLE_SHORT: Record<Role, string> = {
  top: "TOP",
  jungle: "JGL",
  mid: "MID",
  bot: "BOT",
  support: "SUP",
};

export function DraftPage() {
  const navigate = useNavigate();
  const [blue, setBlue] = useState(empty);
  const [red, setRed] = useState(empty);
  const [us, setUs] = useState<Side>("blue");
  const create = useMutation({
    mutationFn: () => api.createPlan({ blue, red, us }),
    onSuccess: (response) => {
      if (response.edit_token) saveToken("plan", response.id, response.edit_token);
      navigate(`/plan/${response.id}`);
    },
  });

  const blueCount = ROLES.filter((r) => blue[r]).length;
  const redCount = ROLES.filter((r) => red[r]).length;
  const pickedCount = blueCount + redCount;
  const complete = pickedCount === 10;

  const swapSides = () => {
    setBlue(red);
    setRed(blue);
    setUs((prev) => (prev === "blue" ? "red" : "blue"));
  };

  return (
    <PageContainer size="default" className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Badge tone="cyan" dot>Step 01 · Draft Entry</Badge>
            <Badge tone={complete ? "good" : "neutral"} mono>
              {pickedCount} / 10 picked
            </Badge>
          </>
        }
        title="New draft"
        description="Enter all 10 champions role-by-role to compute expected 0–30 minute tempo windows, lane priority calls, and objective setups."
        actions={
          <>
            <Button variant="secondary" onClick={swapSides}>
              Swap sides
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setBlue(empty());
                setRed(empty());
              }}
            >
              Clear board
            </Button>
          </>
        }
      />

      {/* Role-Aligned Tactical Draft Board */}
      <Panel>
        <PanelHeader
          title="10-champion matchup matrix"
          description="Champions are aligned by role so direct lane and jungle pairings are immediately clear."
          actions={
            <div className="flex items-center gap-2">
              <Badge tone="blue" dot>
                Blue {blueCount}/5
              </Badge>
              <Badge tone="red" dot>
                Red {redCount}/5
              </Badge>
            </div>
          }
        />
        <PanelBody className="space-y-3">
          {/* Column Headers (Desktop) */}
          <div className="hidden grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] items-center gap-3 px-1 pb-1 text-xs md:grid">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-semibold text-side-blue">
                <span className="h-2 w-2 rounded-full bg-side-blue" />
                Blue side
              </span>
              {us === "blue" && <Badge tone="good">Our side</Badge>}
            </div>
            <div className="text-center font-mono text-[10px] uppercase tracking-wider text-ink-muted">Role</div>
            <div className="flex items-center justify-between">
              {us === "red" ? <Badge tone="good">Our side</Badge> : <span />}
              <span className="flex items-center gap-2 font-display font-semibold text-side-red">
                Red side
                <span className="h-2 w-2 rounded-full bg-side-red" />
              </span>
            </div>
          </div>

          {/* Aligned Matchup Rows */}
          <div className="space-y-2.5">
            {ROLES.map((role) => (
              <div
                key={role}
                className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:items-center md:gap-3"
              >
                <ChampionPicker
                  label={role}
                  side="blue"
                  value={blue[role]}
                  onChange={(next) => setBlue((prev) => ({ ...prev, [role]: next }))}
                />
                <div className="hidden h-9 items-center justify-center rounded-ds border border-line-subtle bg-canvas font-mono text-[10px] font-semibold tracking-wider text-ink-muted md:flex">
                  {ROLE_SHORT[role]}
                </div>
                <ChampionPicker
                  label={role}
                  side="red"
                  value={red[role]}
                  onChange={(next) => setRed((prev) => ({ ...prev, [role]: next }))}
                />
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {/* Action Dock */}
      <Panel tone="raised">
        <PanelBody className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              We are playing
            </span>
            <SegmentedControl
              ariaLabel="Select our side"
              value={us}
              onChange={setUs}
              options={[
                { value: "blue", label: "Blue side" },
                { value: "red", label: "Red side" },
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-accent-cyan transition-all"
                  style={{ width: `${(pickedCount / 10) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs tabular-nums text-ink-muted">{pickedCount}/10</span>
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={!complete || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Building the plan..." : "Build the plan"}
            </Button>
          </div>
        </PanelBody>
      </Panel>

      {create.error && (
        <Callout tone="bad" title="Could not generate game plan">
          {String(create.error.message)}
        </Callout>
      )}
    </PageContainer>
  );
}

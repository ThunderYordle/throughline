import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { Badge, Button, Callout, Panel, PanelHeader, Skeleton } from "../design-system";
import { useDdragon } from "../lib/ddragon";
import { fmtTime } from "../lib/time";
import { ROLES, type Marker, type ReplayParticipant } from "../types";
import { advance, seek, type ClockState } from "./clock";
import { championAtCanvasPoint, DEFAULT_LAYERS, drawFrame, type MapLayers } from "./draw";
import { allFeedEvents, fmtGold, fmtGoldSigned, recentEventsAt, scoreboardAt } from "./state";

const SPEEDS = [1, 2, 4, 8, 20];
const TONE = { good: "bg-status-good", bad: "bg-status-bad", neutral: "bg-ink-secondary" } as const;

const LAYER_META: { key: keyof MapLayers; label: string }[] = [
  { key: "structures", label: "Towers" },
  { key: "pits", label: "Pit zones" },
  { key: "trails", label: "Trails" },
  { key: "fights", label: "Fights" },
  { key: "names", label: "Names" },
];

interface Props {
  gameId: string;
  start?: number;
  end?: number;
  markers?: Marker[];
  focusLabel?: string;
  showRoster?: boolean;
  showEventLog?: boolean;
}

export function ReplayPlayer({
  gameId,
  start,
  end,
  markers = [],
  focusLabel,
  showRoster = true,
  showEventLog = false,
}: Props) {
  const { data: replay, error } = useQuery({ queryKey: ["replay", gameId], queryFn: () => api.replay(gameId) });
  const { iconFor, mapUrl, fallbackMapUrl } = useDdragon();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(520);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [hoveredPid, setHoveredPid] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [fullGameMode, setFullGameMode] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(0);
  const [clock, setClock] = useState<ClockState>({ t: 0, playing: false, speed: 2, start: 0, end: 1, loop: false });

  const isClip = start !== undefined && !fullGameMode;

  useEffect(() => {
    setFullGameMode(false);
  }, [gameId, start, end]);

  useEffect(() => {
    if (!replay) return;
    const clipStart = fullGameMode ? 0 : Math.max(0, start ?? 0);
    const clipEnd = fullGameMode ? replay.game.duration : Math.min(replay.game.duration, end ?? replay.game.duration);
    setClock({
      t: clipStart,
      playing: start !== undefined && !fullGameMode,
      speed: start !== undefined && !fullGameMode ? 1 : 4,
      start: clipStart,
      end: clipEnd,
      loop: start !== undefined && !fullGameMode,
    });
  }, [replay, start, end, fullGameMode]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(240, Math.min(540, Math.floor(entry.contentRect.width)));
      setSize(next);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const images = useMemo(() => {
    const bump = () => setAssetsLoaded((n) => n + 1);
    const map = new Image();
    map.crossOrigin = "anonymous";
    map.onload = bump;
    map.onerror = () => {
      if (map.src !== fallbackMapUrl) {
        map.src = fallbackMapUrl;
      }
    };
    map.src = mapUrl;

    const icons = new Map<string, HTMLImageElement>();
    for (const participant of replay?.participants ?? []) {
      const url = iconFor(participant.champion);
      if (!url) continue;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = bump;
      image.src = url;
      icons.set(participant.champion, image);
    }
    return { map, icons };
  }, [replay, mapUrl, fallbackMapUrl, iconFor]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      setClock((current) => advance(current, now - last));
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !replay) return;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const target = Math.round(size * dpr);
    if (canvas.width !== target || canvas.height !== target) {
      canvas.width = target;
      canvas.height = target;
    }
    drawFrame(ctx, replay, clock.t, size, images.map, images.icons, {
      layers,
      selectedPid,
      hoveredPid,
      dpr,
    });
  }, [clock.t, replay, size, images, layers, selectedPid, hoveredPid, assetsLoaded]);

  const togglePlay = useCallback(() => {
    setClock((current) => ({
      ...current,
      playing: !current.playing,
      t: current.t >= current.end ? current.start : current.t,
    }));
  }, []);

  const stepBy = useCallback((delta: number) => {
    setClock((current) => seek(current, current.t + delta));
  }, []);

  const jumpTo = useCallback((time: number) => {
    setClock((current) => {
      if (time < current.start || time > current.end) {
        setFullGameMode(true);
      }
      return seek(current, time);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepBy(-5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepBy(5);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, stepBy]);

  const currentSec = Math.floor(clock.t);
  const live = useMemo(() => (replay ? scoreboardAt(replay, currentSec) : null), [replay, currentSec]);
  const recent = useMemo(() => (replay ? recentEventsAt(replay, currentSec, 8).slice(0, 3) : []), [replay, currentSec]);
  const fullEvents = useMemo(() => (replay && showEventLog ? allFeedEvents(replay) : []), [replay, showEventLog]);

  if (error) {
    return <Callout tone="bad">Could not load the replay.</Callout>;
  }
  if (!replay || !live) {
    return (
      <div className="w-full max-w-[540px] space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="aspect-square w-full" />
      </div>
    );
  }

  const span = clock.end - clock.start || 1;
  const pct = Math.max(0, Math.min(100, ((clock.t - clock.start) / span) * 100));
  const hoveredPlayer: ReplayParticipant | undefined =
    hoveredPid !== null ? replay.participants.find((p) => p.pid === hoveredPid) : undefined;
  const hoveredStat = hoveredPlayer ? live.players[hoveredPlayer.pid] : undefined;

  const goldLeadSide = live.gold.diff > 0 ? "blue" : live.gold.diff < 0 ? "red" : null;

  const handleCanvasMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * size;
    const y = ((event.clientY - rect.top) / rect.height) * size;
    const hit = championAtCanvasPoint(replay, clock.t, size, x, y);
    setHoveredPid(hit ? hit.pid : null);
    setHoverPos(hit ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * size;
    const y = ((event.clientY - rect.top) / rect.height) * size;
    const hit = championAtCanvasPoint(replay, clock.t, size, x, y);
    setSelectedPid((prev) => (hit ? (prev === hit.pid ? null : hit.pid) : null));
  };

  const scrubberObjectives = replay.objectives.filter((o) => o.t >= clock.start && o.t <= clock.end);
  const scrubberKills = replay.kills.filter((k) => k.t >= clock.start && k.t <= clock.end);

  const playerMap = (side: "blue" | "red") =>
    Object.fromEntries(replay.participants.filter((p) => p.side === side).map((p) => [p.role, p]));
  const blueByRole = playerMap("blue");
  const redByRole = playerMap("red");

  const upcomingObjectives = (replay.setups ?? [])
    .filter((s) => s.taken_at === null || s.taken_at > currentSec)
    .filter((s) => s.spawn_at <= currentSec || s.spawn_at - currentSec <= 180)
    .slice(0, 2);

  const mapAndControls = (
    <div ref={boxRef} className="min-w-0 w-full max-w-[540px] space-y-2.5">
      {/* Live Broadcast Scoreboard Header */}
      <Panel as="div" className="overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2.5">
          {/* Blue side */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-side-blue shadow-[0_0_8px_rgba(56,189,248,0.65)]" />
              <span className="truncate font-display text-sm font-semibold text-side-blue">
                {replay.game.teams.blue}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] tabular-nums text-ink-muted">
              <span title="Team gold" className="text-amber-300/90">{fmtGold(live.gold.blue)}</span>
              <span title="Towers destroyed">T {live.towers.blue}</span>
              <span title="Dragons">D {live.dragons.blue}</span>
              {live.grubs.blue > 0 && <span title="Void Grubs" className="text-violet-300">G {live.grubs.blue}</span>}
              {live.barons.blue > 0 && <span title="Barons" className="text-fuchsia-300">B {live.barons.blue}</span>}
            </div>
          </div>

          {/* Center Score + Clock + Gold Diff */}
          <div className="flex flex-col items-center px-1">
            <div className="flex items-center gap-2 font-display text-lg font-bold tabular-nums leading-none">
              <span className="text-side-blue">{live.kills.blue}</span>
              <span className="rounded-[6px] border border-line bg-surface-raised px-2 py-0.5 font-mono text-xs font-semibold text-ink-primary">
                {fmtTime(clock.t)}
              </span>
              <span className="text-side-red">{live.kills.red}</span>
            </div>
            <div className="mt-1.5">
              <Badge tone={goldLeadSide === "blue" ? "blue" : goldLeadSide === "red" ? "red" : "neutral"} mono>
                {goldLeadSide
                  ? `${goldLeadSide === "blue" ? "BLUE" : "RED"} ${fmtGoldSigned(Math.abs(live.gold.diff))}`
                  : "EVEN GOLD"}
              </Badge>
            </div>
          </div>

          {/* Red side */}
          <div className="min-w-0 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="truncate font-display text-sm font-semibold text-side-red">
                {replay.game.teams.red}
              </span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-side-red shadow-[0_0_8px_rgba(251,113,133,0.65)]" />
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5 font-mono text-[11px] tabular-nums text-ink-muted">
              {live.barons.red > 0 && <span title="Barons" className="text-fuchsia-300">B {live.barons.red}</span>}
              {live.grubs.red > 0 && <span title="Void Grubs" className="text-violet-300">G {live.grubs.red}</span>}
              <span title="Dragons">D {live.dragons.red}</span>
              <span title="Towers destroyed">T {live.towers.red}</span>
              <span title="Team gold" className="text-amber-300/90">{fmtGold(live.gold.red)}</span>
            </div>
          </div>
        </div>
        {focusLabel && (
          <div className="flex items-center justify-between gap-2 border-t border-line-subtle bg-surface-raised/70 px-3 py-1.5 text-xs">
            <span className="truncate text-ink-secondary">
              <span className="mr-1.5 font-semibold text-accent-cyan">Clip:</span>
              {focusLabel}
            </span>
            {start !== undefined && (
              <Button variant="secondary" size="xs" onClick={() => setFullGameMode((v) => !v)}>
                {fullGameMode ? "Back to clip" : "Full game"}
              </Button>
            )}
          </div>
        )}
      </Panel>

      {/* Interactive Tactical Map Canvas */}
      <div className="relative overflow-hidden rounded-ds-lg border border-line bg-canvas shadow-panel">
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size }}
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => {
            setHoveredPid(null);
            setHoverPos(null);
          }}
          onClick={handleCanvasClick}
          className="block aspect-square h-auto w-full cursor-crosshair"
        />

        {/* Top-left clip / live indicator */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
          {isClip ? (
            <span className="rounded-[6px] border border-cyan-400/35 bg-canvas/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-cyan backdrop-blur-sm">
              CLIP {fmtTime(clock.start)} - {fmtTime(clock.end)}
            </span>
          ) : (
            <span className="rounded-[6px] border border-line bg-canvas/90 px-2 py-0.5 font-mono text-[10px] font-medium text-ink-secondary backdrop-blur-sm">
              FULL MAP · PATCH {replay.game.patch}
            </span>
          )}
          {selectedPid !== null && (
            <button
              type="button"
              onClick={() => setSelectedPid(null)}
              className="pointer-events-auto rounded-[6px] border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200 backdrop-blur-sm hover:bg-amber-500/25"
            >
              Tracking {replay.participants.find((p) => p.pid === selectedPid)?.champion} ×
            </button>
          )}
        </div>

        {/* Top-right live / upcoming objective status chips */}
        {upcomingObjectives.length > 0 && (
          <div className="pointer-events-none absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
            {upcomingObjectives.map((obj) => {
              const isUp = obj.spawn_at <= currentSec;
              const remaining = Math.max(0, Math.ceil(obj.spawn_at - currentSec));
              return (
                <span
                  key={`${obj.kind}-${obj.spawn_at}`}
                  className={`rounded-[6px] border px-2 py-0.5 font-mono text-[10px] font-semibold backdrop-blur-sm ${
                    isUp
                      ? "border-emerald-400/45 bg-emerald-950/90 text-emerald-300"
                      : "border-amber-400/35 bg-canvas/90 text-amber-200"
                  }`}
                >
                  {obj.kind.toUpperCase()} {isUp ? "UP" : `in ${fmtTime(remaining)}`}
                </span>
              );
            })}
          </div>
        )}

        {/* Bottom-left live event ticker */}
        {recent.length > 0 && (
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex max-w-[78%] flex-col gap-1">
            {recent.map((event) => (
              <div
                key={event.id}
                className="inline-flex items-center gap-1.5 self-start rounded-[6px] border border-line bg-canvas/90 px-2 py-1 text-[11px] backdrop-blur-sm"
              >
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">{fmtTime(event.t)}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    event.side === "blue" ? "bg-side-blue" : "bg-side-red"
                  }`}
                />
                <span className="font-medium text-ink-primary">{event.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Hover Champion Tooltip */}
        {hoveredPlayer && hoveredStat && hoverPos && (
          <div
            className="pointer-events-none absolute z-20 w-44 rounded-ds border border-line-strong bg-canvas/95 p-2.5 text-xs shadow-elevated backdrop-blur"
            style={{
              left: Math.min(Math.max(8, hoverPos.x + 12), Math.max(8, size - 188)),
              top: Math.max(8, hoverPos.y - 68),
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`font-semibold ${hoveredPlayer.side === "blue" ? "text-side-blue" : "text-side-red"}`}>
                {hoveredPlayer.champion}
              </span>
              <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                Lv {hoveredStat.level}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              {hoveredPlayer.player} · {hoveredPlayer.role.toUpperCase()}
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-line-subtle pt-1 font-mono text-[11px] tabular-nums">
              <span className="text-ink-primary">
                {hoveredStat.kills}/{hoveredStat.deaths}/{hoveredStat.assists}
              </span>
              <span className="text-amber-300">{fmtGold(hoveredStat.gold)}g</span>
            </div>
          </div>
        )}
      </div>

      {/* Layer Toggles & Legend Bar */}
      <Panel as="div" className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {LAYER_META.map(({ key, label }) => {
            const active = layers[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`rounded-[6px] px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/35"
                    : "bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="hidden items-center gap-2.5 text-[10px] text-ink-muted sm:flex">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rotate-45 bg-side-blue" />
            Turret
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border border-dashed border-ink-muted" />
            Fog
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border border-status-good" />
            Pit
          </span>
        </div>
      </Panel>

      {/* Playback Controls + Event-Annotated Scrubber */}
      <Panel as="div" className="p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <Button variant="secondary" size="xs" mono onClick={() => stepBy(-10)} title="Rewind 10 seconds">
            -10s
          </Button>
          <Button variant="accent" size="xs" onClick={togglePlay} className="px-3.5">
            {clock.playing ? "Pause" : "Play"}
          </Button>
          <Button variant="secondary" size="xs" mono onClick={() => stepBy(10)} title="Forward 10 seconds">
            +10s
          </Button>

          <select
            className="h-7 rounded-ds border border-line bg-surface-raised px-2 font-mono text-xs text-ink-primary focus:border-cyan-400/60 focus:outline-none"
            value={clock.speed}
            onChange={(event) => setClock((current) => ({ ...current, speed: Number(event.target.value) }))}
            aria-label="Playback speed"
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setClock((current) => ({ ...current, loop: !current.loop }))}
            className={`h-7 rounded-ds border px-2.5 text-xs font-medium transition-colors ${
              clock.loop
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                : "border-line bg-surface-raised text-ink-muted hover:text-ink-primary"
            }`}
          >
            Loop
          </button>

          <span className="ml-auto font-mono text-xs tabular-nums text-ink-primary">
            {fmtTime(clock.t)} <span className="text-ink-muted">/ {fmtTime(clock.end)}</span>
          </span>
        </div>

        {/* Scrubber Track with Kill/Objective/Review Markers */}
        <div className="relative mt-3 pt-2">
          <div className="pointer-events-none relative h-1.5 w-full rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-status-good"
              style={{ width: `${pct}%` }}
            />
            {scrubberKills.map((kill, index) => (
              <span
                key={`k-${index}-${kill.t}`}
                className={`absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full opacity-75 ${
                  kill.side === "blue" ? "bg-side-blue" : "bg-side-red"
                }`}
                style={{ left: `${((kill.t - clock.start) / span) * 100}%` }}
              />
            ))}
            {scrubberObjectives.map((obj, index) => (
              <span
                key={`o-${index}-${obj.t}`}
                className="absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-status-warn"
                style={{ left: `${((obj.t - clock.start) / span) * 100}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            min={clock.start}
            max={clock.end}
            step={0.5}
            value={clock.t}
            onChange={(event) => setClock((current) => seek(current, Number(event.target.value)))}
            className="tl-scrubber absolute inset-x-0 top-1.5 h-3 w-full cursor-pointer"
            aria-label="Game time"
          />
          {markers
            .filter((marker) => marker.t >= clock.start && marker.t <= clock.end)
            .map((marker) => (
              <button
                key={`${marker.t}-${marker.label}`}
                type="button"
                title={`${fmtTime(marker.t)} ${marker.label}`}
                onClick={() => setClock((current) => seek(current, marker.t))}
                className={`absolute -top-0.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-surface ${TONE[marker.tone]}`}
                style={{ left: `${((marker.t - clock.start) / span) * 100}%` }}
                aria-label={`${fmtTime(marker.t)} ${marker.label}`}
              />
            ))}
        </div>
      </Panel>

      {/* Live 5v5 Role-Matched Gold & Level Breakdown */}
      {showRoster && (
        <Panel as="div" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line-subtle bg-surface-raised/50 px-3 py-1.5 text-[11px] font-medium text-ink-secondary">
            <span>Live lane matchups</span>
            <span className="font-mono text-[10px] text-ink-muted">Click champion to track</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {ROLES.map((role) => {
              const bp = blueByRole[role];
              const rp = redByRole[role];
              if (!bp || !rp) return null;
              const bs = live.players[bp.pid];
              const rs = live.players[rp.pid];
              const diff = (bs?.gold ?? 0) - (rs?.gold ?? 0);
              const bIcon = iconFor(bp.champion);
              const rIcon = iconFor(rp.champion);
              const bSelected = selectedPid === bp.pid;
              const rSelected = selectedPid === rp.pid;

              return (
                <div key={role} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-2.5 py-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedPid((prev) => (prev === bp.pid ? null : bp.pid))}
                    className={`flex min-w-0 items-center gap-2 rounded-[6px] px-1 py-0.5 text-left transition-colors ${
                      bSelected ? "bg-sky-500/15 ring-1 ring-amber-400/70" : "hover:bg-surface-raised"
                    }`}
                  >
                    {bIcon ? (
                      <img src={bIcon} alt={bp.champion} className="h-6 w-6 shrink-0 rounded-full ring-1 ring-side-blue/70" />
                    ) : (
                      <span className="h-6 w-6 shrink-0 rounded-full bg-surface-raised" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-medium text-ink-primary">{bp.champion}</span>
                        <span className="font-mono text-[10px] text-ink-muted">L{bs?.level ?? 1}</span>
                      </div>
                      <div className="font-mono text-[10px] tabular-nums text-ink-muted">
                        {bs?.kills ?? 0}/{bs?.deaths ?? 0}/{bs?.assists ?? 0} · {fmtGold(bs?.gold ?? 0)}
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col items-center px-1 text-center">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                      {role === "support" ? "SUP" : role === "jungle" ? "JGL" : role.toUpperCase()}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold tabular-nums ${
                        diff > 250 ? "text-side-blue" : diff < -250 ? "text-side-red" : "text-ink-muted"
                      }`}
                    >
                      {fmtGoldSigned(diff)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPid((prev) => (prev === rp.pid ? null : rp.pid))}
                    className={`flex min-w-0 flex-row-reverse items-center gap-2 rounded-[6px] px-1 py-0.5 text-right transition-colors ${
                      rSelected ? "bg-rose-500/15 ring-1 ring-amber-400/70" : "hover:bg-surface-raised"
                    }`}
                  >
                    {rIcon ? (
                      <img src={rIcon} alt={rp.champion} className="h-6 w-6 shrink-0 rounded-full ring-1 ring-side-red/70" />
                    ) : (
                      <span className="h-6 w-6 shrink-0 rounded-full bg-surface-raised" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-mono text-[10px] text-ink-muted">L{rs?.level ?? 1}</span>
                        <span className="truncate font-medium text-ink-primary">{rp.champion}</span>
                      </div>
                      <div className="font-mono text-[10px] tabular-nums text-ink-muted">
                        {fmtGold(rs?.gold ?? 0)} · {rs?.kills ?? 0}/{rs?.deaths ?? 0}/{rs?.assists ?? 0}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );

  if (!showEventLog) return mapAndControls;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
      {mapAndControls}
      <Panel as="aside" className="flex min-w-0 flex-col lg:max-h-[820px]">
        <PanelHeader
          title="Match event feed"
          description="Click any kill, objective, or structure to jump the map"
          meta={`${fullEvents.length} events`}
        />
        <ul className="flex-1 divide-y divide-line-subtle overflow-y-auto">
          {fullEvents.map((event) => {
            const passed = event.t <= clock.t;
            const current = Math.abs(event.t - clock.t) <= 6;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(Math.max(0, event.t - 3))}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition-colors hover:bg-surface-raised ${
                    current ? "bg-cyan-500/10" : passed ? "opacity-95" : "opacity-55"
                  }`}
                >
                  <span className="w-11 shrink-0 font-mono tabular-nums text-ink-muted">{fmtTime(event.t)}</span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      event.kind === "objective"
                        ? "bg-status-warn"
                        : event.side === "blue"
                          ? "bg-side-blue"
                          : "bg-side-red"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink-primary">{event.label}</div>
                    {event.detail && <div className="text-[11px] text-ink-muted">{event.detail}</div>}
                  </div>
                  <Badge tone="neutral" mono pill={false}>
                    {event.kind === "structure" ? "tower" : event.kind}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

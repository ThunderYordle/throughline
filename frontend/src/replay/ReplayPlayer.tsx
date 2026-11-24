import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useDdragon } from "../lib/ddragon";
import { fmtTime } from "../lib/time";
import type { Marker } from "../types";
import { advance, seek, type ClockState } from "./clock";
import { drawFrame } from "./draw";

const SPEEDS = [1, 2, 4, 8, 20];
const TONE = { good: "bg-emerald-400", bad: "bg-rose-400", neutral: "bg-zinc-400" } as const;

interface Props {
  gameId: string;
  start?: number;
  end?: number;
  markers?: Marker[];
}

export function ReplayPlayer({ gameId, start, end, markers = [] }: Props) {
  const { data: replay, error } = useQuery({ queryKey: ["replay", gameId], queryFn: () => api.replay(gameId) });
  const { iconFor, mapUrl } = useDdragon();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(560);
  const [clock, setClock] = useState<ClockState>({ t: 0, playing: false, speed: 2, start: 0, end: 1, loop: false });

  useEffect(() => {
    if (!replay) return;
    const clipStart = Math.max(0, start ?? 0);
    const clipEnd = Math.min(replay.game.duration, end ?? replay.game.duration);
    setClock({
      t: clipStart,
      playing: start !== undefined,
      speed: start !== undefined ? 1 : 4,
      start: clipStart,
      end: clipEnd,
      loop: start !== undefined,
    });
  }, [replay, start, end]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setSize(Math.min(640, Math.floor(entry.contentRect.width))));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const images = useMemo(() => {
    const map = new Image();
    map.crossOrigin = "anonymous";
    map.src = mapUrl;
    const icons = new Map<string, HTMLImageElement>();
    for (const participant of replay?.participants ?? []) {
      const url = iconFor(participant.champion);
      if (!url) continue;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = url;
      icons.set(participant.champion, image);
    }
    return { map, icons };
  }, [replay, mapUrl, iconFor]);

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
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && replay) drawFrame(ctx, replay, clock.t, size, images.map, images.icons);
  }, [clock.t, replay, size, images]);

  if (error) return <p className="text-rose-400">Could not load the replay.</p>;
  if (!replay) return <div className="aspect-square w-full max-w-[640px] animate-pulse rounded bg-zinc-900" />;

  const span = clock.end - clock.start || 1;
  return (
    <div ref={boxRef} className="w-full max-w-[640px]">
      <canvas ref={canvasRef} width={size} height={size} className="rounded" />
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-1 hover:bg-zinc-700"
          onClick={() => setClock((current) => ({
            ...current,
            playing: !current.playing,
            t: current.t >= current.end ? current.start : current.t,
          }))}
        >
          {clock.playing ? "Pause" : "Play"}
        </button>
        <select
          className="rounded bg-zinc-800 px-2 py-1"
          value={clock.speed}
          onChange={(event) => setClock((current) => ({ ...current, speed: Number(event.target.value) }))}
          aria-label="Playback speed"
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>{speed}x</option>
          ))}
        </select>
        <span className="tabular-nums text-zinc-400">{fmtTime(clock.t)} / {fmtTime(clock.end)}</span>
      </div>
      <div className="relative mt-2">
        <input
          type="range"
          min={clock.start}
          max={clock.end}
          step={0.5}
          value={clock.t}
          onChange={(event) => setClock((current) => seek(current, Number(event.target.value)))}
          className="w-full"
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
              className={`absolute -top-1 h-2 w-2 rounded-full ${TONE[marker.tone]}`}
              style={{ left: `${((marker.t - clock.start) / span) * 100}%` }}
              aria-label={`${fmtTime(marker.t)} ${marker.label}`}
            />
          ))}
      </div>
    </div>
  );
}
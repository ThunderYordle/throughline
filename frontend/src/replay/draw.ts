import { toCanvas } from "../map/transform";
import type { Replay } from "../types";

const SIDE_COLOR = { blue: "#3b82f6", red: "#ef4444" } as const;
const TRAIL_SECONDS = 10;
const KILL_SHOW_SECONDS = 5;
const OBJECTIVE_COLOR = "#facc15";

function positionAt(
  track: [number, number, number, number][],
  t: number,
): [number, number, boolean, boolean] {
  const i = Math.max(0, Math.min(track.length - 1, Math.floor(t)));
  const j = Math.min(track.length - 1, i + 1);
  const u = t - i;
  const [x0, y0, a0, s0] = track[i];
  const [x1, y1] = track[j];
  return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, a0 === 1, s0 === 1];
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  replay: Replay,
  t: number,
  size: number,
  map: HTMLImageElement | undefined,
  icons: Map<string, HTMLImageElement>,
) {
  ctx.clearRect(0, 0, size, size);
  if (map?.complete) ctx.drawImage(map, 0, 0, size, size);
  ctx.fillStyle = "rgba(9, 9, 11, 0.35)";
  ctx.fillRect(0, 0, size, size);

  for (const spawn of replay.spawns) {
    if (spawn.x === null || spawn.y === null || spawn.t > t) continue;
    const taken = replay.objectives.find((objective) => objective.kind === spawn.kind && objective.t >= spawn.t);
    if (taken && taken.t <= t) continue;
    const [x, y] = toCanvas(spawn.x, spawn.y, size);
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = OBJECTIVE_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const kill of replay.kills) {
    if (kill.t > t || t - kill.t > KILL_SHOW_SECONDS) continue;
    const [x, y] = toCanvas(kill.x, kill.y, size);
    ctx.strokeStyle = SIDE_COLOR[kill.side];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5);
    ctx.lineTo(x + 5, y + 5);
    ctx.moveTo(x + 5, y - 5);
    ctx.lineTo(x - 5, y + 5);
    ctx.stroke();
  }

  const radius = Math.max(9, size / 40);
  for (const participant of replay.participants) {
    const track = replay.positions[String(participant.pid)];
    if (!track?.length) continue;
    ctx.strokeStyle = `${SIDE_COLOR[participant.side]}80`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const trailStart = Math.max(0, Math.floor(t - TRAIL_SECONDS));
    const trailEnd = Math.min(track.length - 1, Math.floor(t));
    for (let second = trailStart; second <= trailEnd; second++) {
      const [x, y] = toCanvas(track[second][0], track[second][1], size);
      if (second === trailStart) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const [gameX, gameY, alive, seen] = positionAt(track, t);
    const [x, y] = toCanvas(gameX, gameY, size);
    ctx.save();
    ctx.globalAlpha = !alive ? 0.3 : seen ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const icon = icons.get(participant.champion);
    if (icon?.complete) ctx.drawImage(icon, x - radius, y - radius, radius * 2, radius * 2);
    else {
      ctx.fillStyle = "#27272a";
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = SIDE_COLOR[participant.side];
    ctx.stroke();
    ctx.restore();
  }
}
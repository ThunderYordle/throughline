import {
  MAP_LABELS,
  MAX_PLATES,
  PIT_RADIUS,
  PLATES_FALL_SECONDS,
  structureStatesAt,
} from "../map/landmarks";
import { MAP_MAX, toCanvas } from "../map/transform";
import { fmtTime } from "../lib/time";
import type { Replay, ReplayParticipant, Side } from "../types";

export interface MapLayers {
  structures: boolean;
  pits: boolean;
  trails: boolean;
  fights: boolean;
  names: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  structures: true,
  pits: true,
  trails: true,
  fights: true,
  names: false,
};

export interface DrawOptions {
  layers?: MapLayers;
  selectedPid?: number | null;
  hoveredPid?: number | null;
  dpr?: number;
}

const SIDE_COLOR: Record<Side, string> = { blue: "#38bdf8", red: "#fb7185" };
const SIDE_DARK: Record<Side, string> = { blue: "#0c4a6e", red: "#881337" };
const TRAIL_SECONDS = 12;
const TRAIL_MAX_JUMP = 2600;
const KILL_SHOW_SECONDS = 8;
const SETUP_APPROACH_SECONDS = 60;
const TAKEN_BANNER_SECONDS = 10;

const OBJECTIVE_STYLE: Record<string, { short: string; label: string; color: string; bg: string }> = {
  dragon: { short: "DRG", label: "DRAGON", color: "#34d399", bg: "rgba(6, 78, 59, 0.9)" },
  elder: { short: "ELD", label: "ELDER", color: "#22d3ee", bg: "rgba(8, 51, 68, 0.92)" },
  grubs: { short: "GRB", label: "GRUBS", color: "#c084fc", bg: "rgba(59, 7, 100, 0.9)" },
  herald: { short: "HRD", label: "HERALD", color: "#a78bfa", bg: "rgba(46, 16, 101, 0.9)" },
  baron: { short: "BRN", label: "BARON", color: "#e879f9", bg: "rgba(74, 4, 78, 0.92)" },
  atakhan: { short: "ATK", label: "ATAKHAN", color: "#f87171", bg: "rgba(69, 10, 10, 0.92)" },
};

export function positionAt(
  track: [number, number, number, number][],
  t: number,
): [number, number, boolean, boolean] {
  const i = Math.max(0, Math.min(track.length - 1, Math.floor(t)));
  const j = Math.min(track.length - 1, i + 1);
  const u = t - i;
  const [x0, y0, a0, s0] = track[i];
  const [x1, y1] = track[j];
  const jump = Math.hypot(x1 - x0, y1 - y0);
  if (jump > TRAIL_MAX_JUMP) {
    return [x0, y0, a0 === 1, s0 === 1];
  }
  return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, a0 === 1, s0 === 1];
}

export function championAtCanvasPoint(
  replay: Replay,
  t: number,
  size: number,
  canvasX: number,
  canvasY: number,
): ReplayParticipant | null {
  const radius = Math.max(11, size / 34) + 4;
  let best: { p: ReplayParticipant; d: number } | null = null;
  for (const participant of replay.participants) {
    const track = replay.positions[String(participant.pid)];
    if (!track?.length) continue;
    const [gx, gy] = positionAt(track, t);
    const [cx, cy] = toCanvas(gx, gy, size);
    const d = Math.hypot(cx - canvasX, cy - canvasY);
    if (d <= radius && (!best || d < best.d)) {
      best = { p: participant, d };
    }
  }
  return best ? best.p : null;
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  options: { bg: string; border?: string; color?: string; font?: string; padX?: number; height?: number },
) {
  ctx.save();
  ctx.font = options.font ?? "600 10px Inter, system-ui, sans-serif";
  const metrics = ctx.measureText(text);
  const padX = options.padX ?? 6;
  const h = options.height ?? 16;
  const w = metrics.width + padX * 2;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = h / 2;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = options.bg;
  ctx.fill();
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = options.color ?? "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  replay: Replay,
  t: number,
  size: number,
  map: HTMLImageElement | undefined,
  icons: Map<string, HTMLImageElement>,
  options: DrawOptions = {},
) {
  const layers = options.layers ?? DEFAULT_LAYERS;
  const dpr = options.dpr ?? 1;
  const selectedPid = options.selectedPid ?? null;
  const hoveredPid = options.hoveredPid ?? null;
  const sec = Math.max(0, Math.min(Math.max(replay.times.length - 1, 0), Math.floor(t)));
  const byPid = new Map(replay.participants.map((p) => [p.pid, p]));

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  // 1. Base map + crisp tactical vignette
  if (map?.complete && map.naturalWidth > 0) {
    ctx.drawImage(map, 0, 0, size, size);
  } else {
    ctx.fillStyle = "#0b111c";
    ctx.fillRect(0, 0, size, size);
  }

  const vignette = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.18,
    size * 0.5,
    size * 0.5,
    size * 0.72,
  );
  vignette.addColorStop(0, "rgba(7, 10, 16, 0.24)");
  vignette.addColorStop(1, "rgba(7, 10, 16, 0.50)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  // Subtle map orientation & pit anchor labels
  ctx.save();
  ctx.font = "600 9px 'Space Grotesk', Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(148, 163, 184, 0.36)";
  for (const landmark of MAP_LABELS) {
    const [lx, ly] = toCanvas(landmark.x, landmark.y, size);
    if (landmark.label === "BARON" || landmark.label === "DRAGON") {
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText(landmark.label, lx, ly + 13);
    } else {
      ctx.fillText(landmark.label, lx, ly);
    }
  }
  ctx.restore();

  // Precompute current champion positions for live pit headcounts & rendering
  const livePos = new Map<number, [number, number, boolean, boolean]>();
  for (const p of replay.participants) {
    const track = replay.positions[String(p.pid)];
    if (!track?.length) continue;
    livePos.set(p.pid, positionAt(track, t));
  }

  // 2. Structures (turrets, inhibitors, nexus, plates)
  if (layers.structures) {
    const states = structureStatesAt(replay.structures, replay.plates, t);
    const turretRadius = Math.max(4.5, size / 115);
    for (const s of states) {
      const [sx, sy] = toCanvas(s.x, s.y, size);
      const teamColor = SIDE_COLOR[s.side];
      const darkFill = SIDE_DARK[s.side];

      if (s.alive) {
        ctx.save();
        if (s.kind === "turret") {
          // Outer turret plate ring before 14:00
          if (s.tier === 1 && t < PLATES_FALL_SECONDS) {
            const remaining = Math.max(0, MAX_PLATES - s.platesTaken);
            if (remaining > 0) {
              ctx.beginPath();
              ctx.arc(
                sx,
                sy,
                turretRadius + 3,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * remaining) / MAX_PLATES,
              );
              ctx.strokeStyle = "rgba(250, 204, 21, 0.78)";
              ctx.lineWidth = 1.6;
              ctx.stroke();
            }
          }
          drawDiamond(ctx, sx, sy, turretRadius);
          ctx.fillStyle = teamColor;
          ctx.fill();
          ctx.strokeStyle = "#070a10";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else if (s.kind === "inhibitor") {
          drawHexagon(ctx, sx, sy, turretRadius + 1.4);
          ctx.fillStyle = darkFill;
          ctx.fill();
          ctx.strokeStyle = teamColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          // Nexus
          ctx.beginPath();
          ctx.arc(sx, sy, turretRadius + 3.2, 0, Math.PI * 2);
          ctx.fillStyle = darkFill;
          ctx.fill();
          ctx.strokeStyle = teamColor;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = s.justDestroyed ? 0.95 : 0.35;
        ctx.strokeStyle = s.justDestroyed ? "#facc15" : "#94a3b8";
        ctx.lineWidth = 1.4;
        const r = turretRadius * 0.85;
        ctx.beginPath();
        ctx.moveTo(sx - r, sy - r);
        ctx.lineTo(sx + r, sy + r);
        ctx.moveTo(sx + r, sy - r);
        ctx.lineTo(sx - r, sy + r);
        ctx.stroke();

        if (s.justDestroyed && s.destroyedAt !== null) {
          const age = Math.max(0, t - s.destroyedAt);
          const pulse = (age % 2) / 2;
          ctx.beginPath();
          ctx.arc(sx, sy, turretRadius + 6 + pulse * 14, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - pulse) * 0.75})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          if (age <= 6) {
            drawPill(ctx, sx, sy - 14, `${s.label.toUpperCase()} DOWN`, {
              bg: "rgba(15, 23, 42, 0.92)",
              border: "#facc15",
              color: "#fef08a",
              font: "700 9px 'JetBrains Mono', monospace",
              height: 15,
            });
          }
        }
        ctx.restore();
      }
    }
  }

  // 3. Objective pit setup zones, timers & live pit headcounts
  if (layers.pits) {
    const pitRadiusPx = (PIT_RADIUS / MAP_MAX) * size;
    const setups = replay.setups ?? [];

    if (setups.length > 0) {
      for (const setup of setups) {
        const style = OBJECTIVE_STYLE[setup.kind] ?? {
          short: setup.kind.slice(0, 3).toUpperCase(),
          label: setup.kind.toUpperCase(),
          color: "#facc15",
          bg: "rgba(30, 41, 59, 0.9)",
        };
        const approaching = t >= setup.spawn_at - SETUP_APPROACH_SECONDS && t < setup.spawn_at;
        const alive = t >= setup.spawn_at && (setup.taken_at === null || t < setup.taken_at);
        const justTaken =
          setup.taken_at !== null && t >= setup.taken_at && t - setup.taken_at <= TAKEN_BANNER_SECONDS;

        if (!approaching && !alive && !justTaken) continue;

        const [px, py] = toCanvas(setup.x, setup.y, size);

        // Count live alive players inside PIT_RADIUS
        let blueNear = 0;
        let redNear = 0;
        for (const p of replay.participants) {
          const pos = livePos.get(p.pid);
          if (!pos || !pos[2]) continue;
          if (Math.hypot(pos[0] - setup.x, pos[1] - setup.y) <= PIT_RADIUS) {
            if (p.side === "blue") blueNear += 1;
            else redNear += 1;
          }
        }

        ctx.save();
        if (approaching || alive) {
          // Tactical setup radius ring
          ctx.beginPath();
          ctx.arc(px, py, pitRadiusPx, 0, Math.PI * 2);
          ctx.fillStyle = alive ? `${style.color}14` : `${style.color}0a`;
          ctx.fill();
          ctx.setLineDash(approaching ? [5, 5] : [8, 4]);
          ctx.strokeStyle = alive ? `${style.color}99` : `${style.color}66`;
          ctx.lineWidth = alive ? 1.8 : 1.3;
          ctx.stroke();
          ctx.setLineDash([]);

          // Objective center badge
          const badgeR = Math.max(10, size / 48);
          ctx.beginPath();
          ctx.arc(px, py, badgeR, 0, Math.PI * 2);
          ctx.fillStyle = style.bg;
          ctx.fill();
          ctx.strokeStyle = style.color;
          ctx.lineWidth = alive ? 2.2 : 1.5;
          ctx.stroke();

          ctx.fillStyle = style.color;
          ctx.font = "700 8.5px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(style.short, px, py + 0.5);

          // Countdown or live label beneath center
          const countdown = Math.max(0, Math.ceil(setup.spawn_at - t));
          const statusLabel = approaching ? `${style.short} ${fmtTime(countdown)}` : `${style.label} UP`;
          drawPill(ctx, px, py + badgeR + 10, statusLabel, {
            bg: "rgba(9, 13, 22, 0.9)",
            border: `${style.color}88`,
            color: style.color,
            font: "600 9px 'JetBrains Mono', monospace",
            height: 15,
          });

          // Live pit headcount badge when players are contesting/setting up
          if (blueNear + redNear > 0) {
            const countText = `PIT ${blueNear}v${redNear}`;
            const leadColor =
              blueNear > redNear ? SIDE_COLOR.blue : redNear > blueNear ? SIDE_COLOR.red : "#e2e8f0";
            drawPill(ctx, px, py - pitRadiusPx + 2, countText, {
              bg: "rgba(9, 13, 22, 0.92)",
              border: leadColor,
              color: leadColor,
              font: "700 9.5px 'JetBrains Mono', monospace",
              height: 16,
            });
          }
        } else if (justTaken && setup.taken_at !== null && setup.by !== null) {
          const age = t - setup.taken_at;
          const progress = Math.min(1, age / TAKEN_BANNER_SECONDS);
          const sideColor = SIDE_COLOR[setup.by];
          ctx.beginPath();
          ctx.arc(px, py, 12 + progress * pitRadiusPx * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = sideColor;
          ctx.globalAlpha = Math.max(0.15, 1 - progress);
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
          drawPill(ctx, px, py, `${setup.by.toUpperCase()} ${style.label}`, {
            bg: "rgba(9, 13, 22, 0.94)",
            border: sideColor,
            color: sideColor,
            font: "700 10px 'Space Grotesk', sans-serif",
            height: 18,
          });
        }
        ctx.restore();
      }
    } else {
      // Fallback when setups are not supplied
      for (const spawn of replay.spawns) {
        if (spawn.x === null || spawn.y === null || spawn.t > t) continue;
        const taken = replay.objectives.find((o) => o.kind === spawn.kind && o.t >= spawn.t);
        if (taken && taken.t <= t) continue;
        const [px, py] = toCanvas(spawn.x, spawn.y, size);
        const style = OBJECTIVE_STYLE[spawn.kind] ?? { short: "OBJ", color: "#facc15", bg: "#1e293b" };
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fillStyle = style.bg;
        ctx.fill();
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = style.color;
        ctx.font = "700 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(style.short, px, py + 0.5);
        ctx.restore();
      }
    }
  }

  // 4. Active Teamfights & Kill Callouts
  if (layers.fights) {
    for (const fight of replay.fights ?? []) {
      if (t < fight.start - 2 || t > fight.end + 5) continue;
      const [fx, fy] = toCanvas(fight.x, fight.y, size);
      const totalKills = fight.kills.blue + fight.kills.red;
      const zoneRadius = Math.max(24, size / 14);
      ctx.save();
      ctx.beginPath();
      ctx.arc(fx, fy, zoneRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(244, 63, 94, 0.14)";
      ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(251, 113, 133, 0.75)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.setLineDash([]);

      if (totalKills >= 2 || fight.present.blue + fight.present.red >= 4) {
        const fightLabel = `${fight.present.blue}v${fight.present.red} · ${fight.kills.blue}-${fight.kills.red}`;
        drawPill(ctx, fx, fy - zoneRadius - 6, fightLabel, {
          bg: "rgba(30, 11, 20, 0.92)",
          border: "#fb7185",
          color: "#fecdd3",
          font: "700 9px 'JetBrains Mono', monospace",
          height: 15,
        });
      }
      ctx.restore();
    }

    for (const kill of replay.kills) {
      if (kill.t > t || t - kill.t > KILL_SHOW_SECONDS) continue;
      const age = t - kill.t;
      const fade = Math.max(0.25, 1 - age / KILL_SHOW_SECONDS);
      const [kx, ky] = toCanvas(kill.x, kill.y, size);
      const color = SIDE_COLOR[kill.side];

      ctx.save();
      ctx.globalAlpha = fade;
      // Expanding impact ripple
      ctx.beginPath();
      ctx.arc(kx, ky, 7 + age * 2.4, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Crisp X burst
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(kx - 5, ky - 5);
      ctx.lineTo(kx + 5, ky + 5);
      ctx.moveTo(kx + 5, ky - 5);
      ctx.lineTo(kx - 5, ky + 5);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (age <= 5) {
        const killerName = kill.killer !== null ? byPid.get(kill.killer)?.champion ?? "?" : "Exec";
        const victimName = byPid.get(kill.victim)?.champion ?? "?";
        drawPill(ctx, kx, ky - 14, `${killerName} × ${victimName}`, {
          bg: "rgba(9, 13, 22, 0.92)",
          border: color,
          color: "#f8fafc",
          font: "600 9px Inter, system-ui, sans-serif",
          height: 15,
        });
      }
      ctx.restore();
    }
  }

  // 5. Champion Trails
  if (layers.trails) {
    const trailStart = Math.max(0, Math.floor(t - TRAIL_SECONDS));
    const trailEnd = Math.floor(t);
    for (const participant of replay.participants) {
      const track = replay.positions[String(participant.pid)];
      if (!track?.length) continue;
      const isFocus = participant.pid === selectedPid || participant.pid === hoveredPid;
      const end = Math.min(track.length - 1, trailEnd);
      if (end <= trailStart) continue;

      ctx.save();
      ctx.lineCap = "round";
      for (let second = trailStart; second < end; second++) {
        const [x0, y0, a0] = track[second];
        const [x1, y1, a1] = track[second + 1];
        if (a0 === 0 || a1 === 0) continue;
        if (Math.hypot(x1 - x0, y1 - y0) > TRAIL_MAX_JUMP) continue;
        const progress = (second - trailStart + 1) / Math.max(1, end - trailStart);
        const [cx0, cy0] = toCanvas(x0, y0, size);
        const [cx1, cy1] = toCanvas(x1, y1, size);
        ctx.beginPath();
        ctx.moveTo(cx0, cy0);
        ctx.lineTo(cx1, cy1);
        ctx.strokeStyle = isFocus ? "#facc15" : SIDE_COLOR[participant.side];
        ctx.globalAlpha = progress * (isFocus ? 0.85 : 0.55);
        ctx.lineWidth = isFocus ? 3 : 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 6. Champion Tokens (draw dead first, alive next, focused last so focus stays on top)
  const sortedParticipants = [...replay.participants].sort((a, b) => {
    const aFocus = a.pid === selectedPid || a.pid === hoveredPid ? 2 : 0;
    const bFocus = b.pid === selectedPid || b.pid === hoveredPid ? 2 : 0;
    if (aFocus !== bFocus) return aFocus - bFocus;
    const aAlive = livePos.get(a.pid)?.[2] ? 1 : 0;
    const bAlive = livePos.get(b.pid)?.[2] ? 1 : 0;
    return aAlive - bAlive;
  });

  const radius = Math.max(10.5, size / 36);
  for (const participant of sortedParticipants) {
    const pos = livePos.get(participant.pid);
    if (!pos) continue;
    const [gameX, gameY, alive, seen] = pos;
    const [x, y] = toCanvas(gameX, gameY, size);
    const isSelected = participant.pid === selectedPid;
    const isHovered = participant.pid === hoveredPid;
    const isFocus = isSelected || isHovered;
    const teamColor = SIDE_COLOR[participant.side];
    const level = replay.player_stats?.[String(participant.pid)]?.[sec]?.[1];

    ctx.save();
    // Focus halo
    if (isFocus) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Drop shadow for crisp separation from terrain
    ctx.beginPath();
    ctx.arc(x, y, radius + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.fill();

    // Champion icon clipped to circle
    ctx.save();
    ctx.globalAlpha = !alive ? 0.32 : seen ? 1 : 0.62;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const icon = icons.get(participant.champion);
    if (icon?.complete && icon.naturalWidth > 0) {
      ctx.drawImage(icon, x - radius, y - radius, radius * 2, radius * 2);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 8px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(participant.champion.slice(0, 3), x, y);
    }
    ctx.restore();

    // Border ring (dashed when fog/interpolated, solid when seen)
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (!seen && alive) ctx.setLineDash([3, 2]);
    ctx.lineWidth = isFocus ? 3 : 2.2;
    ctx.strokeStyle = isFocus ? "#facc15" : !alive ? "#64748b" : teamColor;
    ctx.stroke();
    ctx.setLineDash([]);

    // Dead X overlay
    if (!alive) {
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      const xr = radius * 0.42;
      ctx.beginPath();
      ctx.moveTo(x - xr, y - xr);
      ctx.lineTo(x + xr, y + xr);
      ctx.moveTo(x + xr, y - xr);
      ctx.lineTo(x - xr, y + xr);
      ctx.stroke();
    }

    // Live Level badge pill on bottom-right
    if (level !== undefined && alive) {
      const lx = x + radius * 0.72;
      const ly = y + radius * 0.72;
      const lr = 6.5;
      const isSpike = level === 6 || level === 11 || level === 16;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fillStyle = "#090d16";
      ctx.fill();
      ctx.strokeStyle = isSpike ? "#facc15" : teamColor;
      ctx.lineWidth = isSpike ? 1.5 : 1.1;
      ctx.stroke();
      ctx.fillStyle = isSpike ? "#fef08a" : "#f8fafc";
      ctx.font = "700 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(level), lx, ly + 0.5);
    }

    // Name tag when enabled or focused
    if (layers.names || isFocus) {
      const tag = participant.player || participant.champion;
      drawPill(ctx, x, y + radius + 11, tag, {
        bg: "rgba(7, 10, 16, 0.9)",
        border: isFocus ? "#facc15" : `${teamColor}66`,
        color: "#f1f5f9",
        font: "600 9px Inter, system-ui, sans-serif",
        padX: 5,
        height: 14,
      });
    }

    ctx.restore();
  }

  ctx.restore();
}

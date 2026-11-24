export interface ClockState {
  t: number;
  playing: boolean;
  speed: number;
  start: number;
  end: number;
  loop: boolean;
}

export function advance(s: ClockState, dtMs: number): ClockState {
  if (!s.playing) return s;
  const t = s.t + (dtMs / 1000) * s.speed;
  if (t < s.end) return { ...s, t };
  if (s.loop) return { ...s, t: s.start };
  return { ...s, t: s.end, playing: false };
}

export function seek(s: ClockState, t: number): ClockState {
  return { ...s, t: Math.min(s.end, Math.max(s.start, t)) };
}
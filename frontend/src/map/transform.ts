export const MAP_MAX = 15000;

export function toCanvas(x: number, y: number, size: number): [number, number] {
  return [(x / MAP_MAX) * size, size - (y / MAP_MAX) * size];
}
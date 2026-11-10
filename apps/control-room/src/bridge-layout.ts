import type { Station } from './navigation.ts';

export type Point = readonly [number, number, number];
export const OVERVIEW: Point = [0, 3.4, 12];
export const TABLE_RADIUS = 3.25;
export const TABLE_OUTER_RADIUS = 3.38;
export const MAP_MONITOR_SIZE: Point = [2.6, 1.05, .15];
export function monitorSize(station: Station): Point {
  return station === 'map' ? MAP_MONITOR_SIZE : [3.45, 1.98, .15];
}
// Fit the physical bezel into the actual work-area aspect, before the responsive UI handoff.
export function monitorFov(station: Station, aspect: number): number {
  const [width, height] = monitorSize(station);
  return 2 * Math.atan(Math.max(height / 2, width / (2 * aspect)) * 1.015 / 1.8) * 180 / Math.PI;
}
export function monitorEye(station: Station): Point {
  const eye = operatorEye(station);
  return [eye[0], CONSOLES[station].screen[1], eye[2]];
}
// Opaque rear half-shell, outside the tabletop; open toward the entrance.
export const MAP_GUARD = { innerRadius: 3.43, outerRadius: 3.65, bottom: .98, endTop: 1.12, crownTop: 2.3 };
export function guardTop(angle: number): number {
  return MAP_GUARD.endTop + (MAP_GUARD.crownTop - MAP_GUARD.endTop) * Math.sin(angle) ** 1.5;
}
export const PARTNER_POSITIONS: Point[] = [[-3.9, 0, 2], [3.9, 0, 2]];
export const CONSOLES: Record<Station, { screen: Point; yaw: number }> = {
  mission: { screen: [-7, 1.75, .4], yaw: .65 },
  // Entrance is +Z. The screen BACK attaches to the far table rim; its front faces -Z.
  // The operator sits beyond it and looks inward (+Z), never toward the windows.
  map: { screen: [0, 1.45, -4.05], yaw: Math.PI },
  operations: { screen: [7, 1.75, .4], yaw: -.65 },
};
export function operatorEye(station: Station): Point {
  const { screen, yaw } = CONSOLES[station];
  return [screen[0] + Math.sin(yaw) * 1.8, 1.75, screen[2] + Math.cos(yaw) * 1.8];
}
export function canWalk(x: number, z: number): boolean {
  // Keep eye/body clearance from the inward-sloping wall ribs and rear door frame.
  if (Math.abs(x) > 10.7 || z < -9.3 || z > 12.6 || Math.hypot(x, z) < TABLE_RADIUS + .45) return false;
  if (z <= .35 && Math.hypot(x, z) < MAP_GUARD.outerRadius + .45) return false;
  if (PARTNER_POSITIONS.some(p => Math.hypot(x - p[0], z - p[2]) < .7)) return false;
  // Console hardware has a clearance volume; the seated eye position is outside it.
  return Object.values(CONSOLES).every(({ screen }) => Math.hypot(x - screen[0], z - screen[2]) >= 1.4);
}
export function clearSegment(a: Point, b: Point): boolean {
  const count = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / .12);
  for (let i = 0; i <= count; i++) {
    const t = count ? i / count : 0;
    if (!canWalk(a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t)) return false;
  }
  return true;
}

export function canExplore(x: number, z: number, previous: Point): boolean {
  if (!canWalk(x, z)) return false;
  return (Object.keys(CONSOLES) as Station[]).every(station => {
    const eye = operatorEye(station), distance = Math.hypot(x - eye[0], z - eye[2]);
    const before = Math.hypot(previous[0] - eye[0], previous[2] - eye[2]);
    // A user can leave a seat after taking over its view, but cannot walk into another operator.
    return distance >= .75 || before < .75 && distance >= before;
  });
}

// Small navigation mesh for this blockout. The final art must retain these clearances.
// A* supports console entry after arbitrary free exploration, without resetting the camera.
export function walkPath(from: Point, to: Point): Point[] {
  if (clearSegment(from, to)) return [from, to];
  const key = (x: number, z: number) => `${x},${z}`;
  const cell = (p: Point) => [Math.round(p[0] * 2), Math.round(p[2] * 2)] as const;
  const [sx, sz] = cell(from), [ex, ez] = cell(to);
  const first = key(sx, sz), last = key(ex, ez);
  const open = new Set([first]), costs = new Map([[first, 0]]), parents = new Map<string, string>();
  const coordinates = new Map<string, readonly [number, number]>([[first, [sx, sz]]]);
  let found = false;
  for (let guard = 0; open.size && guard < 2500; guard++) {
    let current = first, best = Infinity;
    for (const candidate of open) {
      const [x, z] = coordinates.get(candidate)!;
      const score = costs.get(candidate)! + Math.hypot(x - ex, z - ez);
      if (score < best) { best = score; current = candidate; }
    }
    if (current === last) { found = true; break; }
    open.delete(current);
    const [x, z] = coordinates.get(current)!;
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (!clearSegment([x / 2, 1.75, z / 2], [nx / 2, 1.75, nz / 2])) continue;
      const next = key(nx, nz), cost = costs.get(current)! + Math.hypot(dx, dz);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, cost); coordinates.set(next, [nx, nz]); parents.set(next, current); open.add(next);
    }
  }
  if (!found) return []; // Never cut through the table when a route cannot be found.
  const raw: Point[] = [to];
  for (let current = last; current !== first; current = parents.get(current)!) {
    const [x, z] = coordinates.get(current)!; raw.unshift([x / 2, 1.75, z / 2]);
  }
  raw.unshift(from);
  const result: Point[] = [from]; let index = 0;
  while (index < raw.length - 1) {
    let next = raw.length - 1;
    while (next > index + 1 && !clearSegment(raw[index]!, raw[next]!)) next--;
    result.push(raw[next]!); index = next;
  }
  return result;
}

export function consolePath(from: Point, station: Station): Point[] {
  if (station !== 'map') return walkPath(from, operatorEye(station));
  // Map approach deliberately circles the table to the far-side navigation screen.
  const depth = Math.abs(operatorEye('map')[2]);
  const approach = walkPath(from, [0, 1.75, depth]);
  if (!approach.length) return [];
  const arc: Point[] = Array.from({ length: 33 }, (_, index) => {
    const angle = index / 32 * Math.PI;
    return [Math.sin(angle) * 5.2, 1.75, Math.cos(angle) * depth];
  });
  return [...approach, ...arc.slice(1), operatorEye('map')];
}

export function samplePath(points: Point[], progress: number): Point {
  if (!points.length) return OVERVIEW;
  if (progress <= 0) return points[0]!;
  if (progress >= 1) return points.at(-1)!;
  const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i]![0], point[1] - points[i]![1], point[2] - points[i]![2]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, progress));
  for (const [i, length] of lengths.entries()) {
    if (remaining <= length && length > 0) {
      const a = points[i]!, b = points[i + 1]!, t = remaining / length;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    remaining -= length;
  }
  return points.at(-1)!;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSOLES, MAP_GUARD, guardTop, monitorEye, monitorFov, monitorSize, MAP_MONITOR_SIZE, OVERVIEW, TABLE_OUTER_RADIUS, TABLE_RADIUS, canExplore, canWalk, clearSegment, consolePath, operatorEye, samplePath, walkPath } from '../src/bridge-layout.ts';

test('docking faces each monitor squarely and fits the bezel across work-area aspect ratios', () => {
  for (const station of ['mission', 'map', 'operations'] as const) for (const aspect of [.55, 1, 1.8, 3.2]) {
    assert.equal(monitorEye(station)[1], CONSOLES[station].screen[1]);
    const [width, height] = monitorSize(station);
    const visibleHeight = 3.6 * Math.tan(monitorFov(station, aspect) * Math.PI / 360);
    assert.ok(visibleHeight >= height && visibleHeight * aspect >= width);
    assert.ok(Math.max(height / visibleHeight, width / (visibleHeight * aspect)) > .98);
  }
});

test('rear guard hides the seated head from the entrance while leaving the front approach open', () => {
  const eye = operatorEye('map');
  const t = (-MAP_GUARD.innerRadius - OVERVIEW[2]) / (eye[2] - OVERVIEW[2]);
  const sightlineHeight = OVERVIEW[1] + (1.93 - OVERVIEW[1]) * t;
  assert.ok(guardTop(Math.PI / 2) > sightlineHeight + .1);
  assert.ok(MAP_GUARD.innerRadius > TABLE_OUTER_RADIUS);
  assert.ok(guardTop(0) < 1.2 && guardTop(Math.PI) < 1.2);
  assert.equal(canWalk(0, -3.9), false);
  assert.equal(canWalk(0, 3.9), true);
});

test('all console routes end at the occupied eye position with a clear hardware approach', () => {
  for (const station of ['mission', 'map', 'operations'] as const) {
    const path = consolePath(OVERVIEW, station);
    assert.ok(path.length >= 2);
    assert.deepEqual(path.at(-1), operatorEye(station));
    assert.deepEqual(samplePath(path, 0), OVERVIEW);
    assert.deepEqual(samplePath(path, 1), operatorEye(station));
    for (let i = 1; i < path.length; i++) assert.ok(clearSegment(path[i - 1]!, path[i]!), `${station} intersects a table, console or partner position`);
    const eye = operatorEye(station), screen = CONSOLES[station].screen;
    assert.ok(Math.abs(Math.hypot(eye[0] - screen[0], eye[2] - screen[2]) - 1.8) < .001);
  }
});

test('navigation route circles to the far side rather than crossing through the map', () => {
  const path = consolePath(OVERVIEW, 'map');
  assert.ok(path.some(point => point[0] > 5));
  assert.ok(path.some(point => point[2] < -5));
  for (let t = 0; t <= 1; t += .002) {
    const point = samplePath(path, t);
    assert.ok(Math.hypot(point[0], point[2]) > TABLE_RADIUS + .4);
  }
});

test('map monitor attaches to the far table rim with its screen facing outward and operator facing inward', () => {
  const { screen, yaw } = CONSOLES.map, eye = operatorEye('map');
  assert.ok(Math.abs(screen[2]) - MAP_MONITOR_SIZE[2] / 2 > TABLE_OUTER_RADIUS + .5, 'Entire monitor must stand outside the tabletop with a visible gap');
  assert.ok(screen[1] + MAP_MONITOR_SIZE[1] / 2 < 2, 'Monitor top must stay below the hologram planets');
  assert.ok(screen[2] < 0 && eye[2] < screen[2]);
  assert.ok(Math.cos(yaw) < -.99, 'Screen front must face away from the entrance');
  assert.ok(screen[2] - eye[2] > 1.7, 'Seated view must look back toward the table and entrance');
});

test('free exploration is bounded and a cross-room command routes around furniture', () => {
  assert.equal(canWalk(0, 0), false);
  assert.equal(canWalk(15, 0), false);
  assert.equal(canWalk(11.3, -3), false, 'Side ribs must remain outside the walkable area');
  assert.equal(canWalk(0, 13), false, 'Rear door needs camera clearance');
  assert.equal(canWalk(0, -12), false);
  assert.equal(canWalk(3.9, 2), false);
  const path = walkPath([-8, 1.75, 2], [8, 1.75, 2]);
  assert.ok(path.length > 2);
  for (let i = 1; i < path.length; i++) assert.ok(clearSegment(path[i - 1]!, path[i]!));
});

test('free camera can leave a transferred seat but cannot walk into a seated operator', () => {
  const eye = operatorEye('map');
  assert.equal(canExplore(eye[0], eye[2] + .05, eye), true);
  assert.equal(canExplore(eye[0], eye[2] + .5, [eye[0], eye[1], eye[2] + 1]), false);
});

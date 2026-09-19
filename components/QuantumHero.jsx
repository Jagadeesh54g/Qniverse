'use client';

import { useEffect, useRef } from 'react';

/* ------------------------------------------------------------------
   QuantumHero — the Qniverse logo as a living Bloch sphere.

   • purple ring  = the sphere's equator
   • cyan hand    = the qubit's state vector
   • gates (H, T, S, X, Y, Z) rotate the vector along real arcs
   • every few gates the hand sweeps, the halo of "possibilities"
     collapses onto |0⟩ or |1⟩ (Born-rule weighted), and a bit appears
   • move the pointer to tilt the scene, click to measure

   Bloch coordinates: x, y, z with z pointing up.  |0⟩ = north pole.
   Everything is plain canvas — no dependencies.
------------------------------------------------------------------- */

const RING = '#6f3ff5';
const HAND = '#08bdba';
const INK = '#161616';
const MUTED = '#525252';
const RING_RGB = '111,63,245';
const HAND_RGB = '8,189,186';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const rnd = Math.random;

/* ---------- tiny vector helpers ---------- */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Rodrigues rotation of v about unit axis k by angle a.
function rotate(v, k, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = dot(k, v);
  const kx = cross(k, v);
  return [
    v[0] * c + kx[0] * s + k[0] * kv * (1 - c),
    v[1] * c + kx[1] * s + k[1] * kv * (1 - c),
    v[2] * c + kx[2] * s + k[2] * kv * (1 - c),
  ];
}

// Move along the shortest arc from a to b.
function slerp(a, b, t) {
  const ang = Math.acos(clamp(dot(a, b), -1, 1));
  if (ang < 1e-4) return b.slice();
  let axis = cross(a, b);
  if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-4) axis = [1, 0, 0]; // antipodal
  return rotate(a, norm(axis), ang * t);
}

/* ---------- gates as rotations of the Bloch sphere ---------- */
const GATES = {
  H: { axis: norm([1, 0, 1]), angle: Math.PI, weight: 2.4 },
  X: { axis: [1, 0, 0], angle: Math.PI, weight: 1 },
  Y: { axis: [0, 1, 0], angle: Math.PI, weight: 1 },
  Z: { axis: [0, 0, 1], angle: Math.PI, weight: 1 },
  S: { axis: [0, 0, 1], angle: Math.PI / 2, weight: 1.2 },
  T: { axis: [0, 0, 1], angle: Math.PI / 4, weight: 1.2 },
};

// Pick a gate that visibly moves the vector and isn't a repeat.
function pickGate(v, last) {
  const pool = [];
  let total = 0;
  for (const name of Object.keys(GATES)) {
    if (name === last) continue;
    const g = GATES[name];
    const to = rotate(v, g.axis, g.angle);
    if (Math.hypot(to[0] - v[0], to[1] - v[1], to[2] - v[2]) < 0.45) continue;
    pool.push([name, g.weight]);
    total += g.weight;
  }
  if (!pool.length) return 'H';
  let r = rnd() * total;
  for (const [name, w] of pool) {
    r -= w;
    if (r <= 0) return name;
  }
  return pool[pool.length - 1][0];
}

/* ---------- unit circles (precomputed once) ---------- */
const SEG = 72;
const ring = (fn) => Array.from({ length: SEG + 1 }, (_, i) => fn((i / SEG) * TAU));
const EQUATOR = ring((a) => [Math.cos(a), Math.sin(a), 0]);
const MERIDIAN_A = ring((a) => [Math.cos(a), 0, Math.sin(a)]);
const MERIDIAN_B = ring((a) => [0, Math.cos(a), Math.sin(a)]);

/* ---------- simulation state ---------- */
function makeParticles(n) {
  return Array.from({ length: n }, () => ({
    p: [0, 0, 1],
    off: norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]),
    r: 0.35 + rnd() * 0.65,
    k: 2.5 + rnd() * 5,
    w: (0.3 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1),
    ph: rnd() * TAU,
    sz: 0.8 + rnd() * 1.4,
    hand: rnd() < 0.7,
    sx: 0,
    sy: 0,
    d: 0,
  }));
}

function createSim() {
  return {
    time: 0,
    v: [0, 0, 1],
    phase: 'hold', // hold | gate | sweep | collapse
    t: 0,
    dur: 0.6,
    gate: null,
    lastGate: null,
    from: [0, 0, 1],
    to: [0, 0, 1],
    outcome: 0,
    gatesLeft: 3,
    pendingMeasure: false,
    sweep: 0,
    spread: 1,
    trail: [],
    hist: [],
    chip: null,
    shock: null,
    bit: null,
    shots: 0,
    tally: [0, 0],
    hinted: false,
    mx: 0,
    my: 0,
    tmx: 0,
    tmy: 0,
    parts: makeParticles(96),
  };
}

const toHold = (S, d) => {
  S.phase = 'hold';
  S.t = 0;
  S.dur = d;
};

const pushHist = (S, label) => {
  S.hist.push(label);
  if (S.hist.length > 5) S.hist.shift();
};

const beginGate = (S) => {
  const name = pickGate(S.v, S.lastGate);
  const g = GATES[name];
  S.phase = 'gate';
  S.t = 0;
  S.dur = 0.55 + (g.angle / Math.PI) * 0.65;
  S.gate = name;
  S.lastGate = name;
  S.from = S.v.slice();
  S.chip = { label: name, age: 0 };
  pushHist(S, name);
};

const beginSweep = (S) => {
  S.phase = 'sweep';
  S.t = 0;
  S.dur = 1.2;
  S.sweep = 0;
  S.pendingMeasure = false;
  S.chip = null;
};

const beginCollapse = (S) => {
  const p0 = (1 + S.v[2]) / 2; // Born rule: P(0) = cos²(θ/2)
  S.outcome = rnd() < p0 ? 0 : 1;
  S.phase = 'collapse';
  S.t = 0;
  S.dur = 0.5;
  S.from = S.v.slice();
  S.to = [0, 0, S.outcome === 0 ? 1 : -1];
};

function update(S, dt) {
  S.time += dt;
  S.t += dt;

  // pointer parallax, smoothed
  const s = 1 - Math.exp(-4 * dt);
  S.mx += (S.tmx - S.mx) * s;
  S.my += (S.tmy - S.my) * s;

  switch (S.phase) {
    case 'hold':
      if (S.pendingMeasure || (S.t > S.dur && S.gatesLeft <= 0)) beginSweep(S);
      else if (S.t > S.dur) beginGate(S);
      break;

    case 'gate': {
      if (S.pendingMeasure) {
        beginSweep(S);
        break;
      }
      const p = clamp(S.t / S.dur, 0, 1);
      const g = GATES[S.gate];
      S.v = rotate(S.from, g.axis, g.angle * easeInOut(p));
      S.trail.push({ p: S.v.slice(), life: 1 });
      if (p >= 1) {
        S.v = norm(S.v);
        S.gatesLeft -= 1;
        toHold(S, 0.55 + rnd() * 0.35);
      }
      break;
    }

    case 'sweep': {
      const p = clamp(S.t / S.dur, 0, 1);
      S.sweep = TAU * easeSine(p);
      S.spread = 1 + 1.4 * Math.sin(Math.PI * p);
      if (p >= 1) beginCollapse(S);
      break;
    }

    case 'collapse': {
      const p = clamp(S.t / S.dur, 0, 1);
      S.v = slerp(S.from, S.to, easeOut(p));
      S.spread = 0.25;
      S.trail.push({ p: S.v.slice(), life: 1 });
      if (p >= 1) {
        S.v = S.to.slice();
        S.shots += 1;
        S.tally[S.outcome] += 1;
        S.shock = { z: S.to[2], age: 0 };
        S.bit = { char: String(S.outcome), z: S.to[2], age: 0 };
        pushHist(S, 'M');
        S.gatesLeft = 3 + Math.floor(rnd() * 2);
        toHold(S, 1.25);
      }
      break;
    }
    default:
      break;
  }

  // the halo relaxes back to its resting size outside a measurement
  if (S.phase !== 'sweep' && S.phase !== 'collapse') {
    S.spread += (1 - S.spread) * (1 - Math.exp(-2.2 * dt));
  }

  // transient effects
  if (S.chip) {
    S.chip.age += dt;
    if (S.chip.age > 1.35) S.chip = null;
  }
  if (S.shock) {
    S.shock.age += dt;
    if (S.shock.age > 1.1) S.shock = null;
  }
  if (S.bit) {
    S.bit.age += dt;
    if (S.bit.age > 1.4) S.bit = null;
  }
  for (const pt of S.trail) pt.life -= dt * 1.1;
  while (S.trail.length && S.trail[0].life <= 0) S.trail.shift();
  if (S.trail.length > 80) S.trail.splice(0, S.trail.length - 80);

  // halo particles chase the tip; they stream to the pole on collapse
  const boost = S.phase === 'collapse' ? 2.4 : S.phase === 'sweep' ? 1.2 : 1;
  for (const q of S.parts) {
    const ca = Math.cos(S.time * q.w + q.ph);
    const sa = Math.sin(S.time * q.w + q.ph);
    const ox = q.off[0] * ca - q.off[1] * sa;
    const oy = q.off[0] * sa + q.off[1] * ca;
    const oz = q.off[2];
    const rad = q.r * 0.2 * S.spread * (0.75 + 0.25 * Math.sin(S.time * 2.1 + q.ph * 2));
    const f = 1 - Math.exp(-q.k * boost * dt);
    q.p[0] += (S.v[0] + ox * rad - q.p[0]) * f;
    q.p[1] += (S.v[1] + oy * rad - q.p[1]) * f;
    q.p[2] += (S.v[2] + oz * rad - q.p[2]) * f;
  }
}

// A pleasing still pose for prefers-reduced-motion.
function settleStatic(S) {
  S.time = 2.1;
  S.v = norm([0.52, 0.46, 0.72]);
  S.hist = ['H', 'T', 'S'];
  S.hinted = true;
  for (const q of S.parts) {
    q.p = [
      S.v[0] + q.off[0] * q.r * 0.2,
      S.v[1] + q.off[1] * q.r * 0.2,
      S.v[2] + q.off[2] * q.r * 0.2,
    ];
  }
}

/* ---------- drawing ---------- */
function render(ctx, S, w, h) {
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.3;
  const k = clamp(R / 200, 0.5, 1.3); // stroke / dot scale
  const hs = clamp(Math.min(w, h) / 720, 0.8, 1.15); // HUD scale

  // camera: slow auto-orbit + pointer parallax
  const az = S.time * 0.22 + S.mx * 0.65;
  const el = clamp(0.36 + S.my * 0.25, 0.08, 0.8);
  const ca = Math.cos(az);
  const sa = Math.sin(az);
  const ce = Math.cos(el);
  const se = Math.sin(el);
  // returns [screenX, screenY, depth]; depth < 0 means nearer to the viewer
  const proj = (x, y, z) => {
    const x1 = x * ca - y * sa;
    const y1 = x * sa + y * ca;
    return [cx + x1 * R, cy - (y1 * se + z * ce) * R, y1 * ce - z * se];
  };

  const v = S.v;
  const line = (a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  const disc = (x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  };
  const glow = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    disc(x, y, r);
  };

  // --- ambient field + glassy sphere body ---------------------------------
  glow(cx, cy, R * 1.9, RING_RGB, 0.11);

  const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  body.addColorStop(0, 'rgba(255,255,255,0.7)');
  body.addColorStop(1, `rgba(${RING_RGB},0.07)`);
  ctx.fillStyle = body;
  disc(cx, cy, R);
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${RING_RGB},0.28)`;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();

  // --- rings, split into a back pass and a front pass ---------------------
  const eq = EQUATOR.map((p) => proj(p[0], p[1], p[2]));
  const ma = MERIDIAN_A.map((p) => proj(p[0], p[1], p[2]));
  const mb = MERIDIAN_B.map((p) => proj(p[0], p[1], p[2]));
  const strokeRing = (pts, front, width, style) => {
    ctx.beginPath();
    let open = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if ((a[2] + b[2] < 0) !== front) {
        open = false;
        continue;
      }
      if (!open) {
        ctx.moveTo(a[0], a[1]);
        open = true;
      }
      ctx.lineTo(b[0], b[1]);
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
  const ringW = 9 * k * (1 + Math.sin(S.time * 1.4) * 0.05); // the logo ring, breathing

  strokeRing(ma, false, 1, `rgba(${RING_RGB},0.14)`);
  strokeRing(mb, false, 1, `rgba(${RING_RGB},0.14)`);
  strokeRing(eq, false, 3.2 * k, `rgba(${RING_RGB},0.3)`);

  // axes
  ctx.save();
  ctx.setLineDash([3 * k, 5 * k]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(22,22,22,0.22)';
  line(proj(0, 0, -1.16), proj(0, 0, 1.16));
  line(proj(-1.16, 0, 0), proj(1.16, 0, 0));
  ctx.restore();

  // --- measurement sweep: the logo's hand as a radar arm -------------------
  if (S.phase === 'sweep') {
    const p = clamp(S.t / S.dur, 0, 1);
    const fade = Math.sqrt(Math.sin(Math.PI * p));
    const a = S.sweep;
    const N = 18;
    for (let j = 0; j < N; j++) {
      const p1 = proj(Math.cos(a - j * 0.05), Math.sin(a - j * 0.05), 0);
      const p2 = proj(Math.cos(a - (j + 1) * 0.05), Math.sin(a - (j + 1) * 0.05), 0);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath();
      ctx.fillStyle = `rgba(${HAND_RGB},${0.2 * (1 - j / N) * fade})`;
      ctx.fill();
    }
    const end = proj(Math.cos(a), Math.sin(a), 0);
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6 * k;
    ctx.strokeStyle = `rgba(${HAND_RGB},${0.7 * fade})`;
    line([cx, cy], end);
    ctx.fillStyle = `rgba(${HAND_RGB},${0.9 * fade})`;
    disc(end[0], end[1], 3 * k);
  }

  // --- tip trail -----------------------------------------------------------
  ctx.lineCap = 'round';
  for (let i = 1; i < S.trail.length; i++) {
    const a = S.trail[i - 1];
    const b = S.trail[i];
    ctx.globalAlpha = Math.max(0, b.life) * 0.55;
    ctx.lineWidth = (1 + 3.2 * Math.max(0, b.life)) * k;
    ctx.strokeStyle = HAND;
    line(proj(a.p[0], a.p[1], a.p[2]), proj(b.p[0], b.p[1], b.p[2]));
  }
  ctx.globalAlpha = 1;

  // --- halo of possibilities (back half) -----------------------------------
  for (const q of S.parts) {
    const s = proj(q.p[0], q.p[1], q.p[2]);
    q.sx = s[0];
    q.sy = s[1];
    q.d = s[2];
  }
  const drawParts = (front) => {
    ctx.globalAlpha = front ? 0.85 : 0.32;
    for (const q of S.parts) {
      if ((q.d < 0) !== front) continue;
      ctx.fillStyle = q.hand ? HAND : RING;
      disc(q.sx, q.sy, q.sz * k * (front ? 1 : 0.75));
    }
    ctx.globalAlpha = 1;
  };
  drawParts(false);

  // --- the state vector ("the hand") ----------------------------------------
  const tip = proj(v[0], v[1], v[2]);
  const foot = proj(v[0], v[1], 0);

  ctx.save();
  ctx.setLineDash([3 * k, 4 * k]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${HAND_RGB},0.55)`;
  line(tip, foot);
  line([cx, cy], foot);
  ctx.restore();
  ctx.fillStyle = `rgba(${HAND_RGB},0.55)`;
  disc(foot[0], foot[1], 2.6 * k);

  ctx.lineCap = 'round';
  ctx.lineWidth = 14 * k;
  ctx.strokeStyle = `rgba(${HAND_RGB},0.16)`;
  line([cx, cy], tip);
  ctx.lineWidth = 5 * k;
  ctx.strokeStyle = HAND;
  line([cx, cy], tip);

  glow(tip[0], tip[1], 30 * k, HAND_RGB, 0.5);
  ctx.fillStyle = HAND;
  disc(tip[0], tip[1], 6.5 * k);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.arc(tip[0], tip[1], 6.5 * k, 0, TAU);
  ctx.stroke();

  // core
  const core = 1 + Math.sin(S.time * 2.6) * 0.1;
  glow(cx, cy, 26 * k, RING_RGB, 0.45);
  ctx.fillStyle = RING;
  disc(cx, cy, 8.5 * k * core);

  drawParts(true);

  // --- front pass of rings ---------------------------------------------------
  strokeRing(ma, true, 1.2, `rgba(${RING_RGB},0.34)`);
  strokeRing(mb, true, 1.2, `rgba(${RING_RGB},0.34)`);
  strokeRing(eq, true, ringW, RING);

  // --- basis-state labels ----------------------------------------------------
  ctx.font = `${11 * hs}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  const label = (text, x, y, z) => {
    const p = proj(x, y, z);
    ctx.globalAlpha = p[2] < 0 ? 0.8 : 0.32;
    ctx.fillText(text, p[0], p[1]);
  };
  label('|0\u27e9', 0, 0, 1.22);
  label('|1\u27e9', 0, 0, -1.22);
  label('|+\u27e9', 1.24, 0, 0);
  label('|\u2212\u27e9', -1.24, 0, 0);
  ctx.globalAlpha = 1;

  // --- collapse shockwave, outcome bit, gate chip ----------------------------
  if (S.shock) {
    for (const delay of [0, 0.14]) {
      const p = clamp((S.shock.age - delay) / 0.9, 0, 1);
      if (p <= 0 || p >= 1) continue;
      const rad = 0.06 + easeOut(p) * 0.75;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const s = proj(Math.cos(a) * rad, Math.sin(a) * rad, S.shock.z);
        if (i) ctx.lineTo(s[0], s[1]);
        else ctx.moveTo(s[0], s[1]);
      }
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.lineWidth = (0.6 + 2.4 * (1 - p)) * k;
      ctx.strokeStyle = HAND;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (S.bit) {
    const p = clamp(S.bit.age / 1.4, 0, 1);
    const pole = proj(0, 0, S.bit.z);
    const dir = S.bit.z > 0 ? -1 : 1;
    ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.55) / 0.45);
    ctx.font = `500 ${40 * hs}px ${MONO}`;
    ctx.fillStyle = S.bit.char === '0' ? RING : HAND;
    ctx.fillText(S.bit.char, pole[0] + 46 * hs, pole[1] + dir * (6 * hs + p * 22 * hs));
    ctx.globalAlpha = 1;
  }

  if (S.chip && (S.phase === 'gate' || S.phase === 'hold')) {
    const age = S.chip.age;
    const a = Math.min(1, age / 0.12) * clamp((1.35 - age) / 0.3, 0, 1);
    const size = 26 * hs;
    const x = tip[0] + 16 * hs;
    const y = tip[1] - 34 * hs;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, size, size);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = RING;
    ctx.strokeRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5);
    ctx.fillStyle = RING;
    ctx.font = `600 ${12 * hs}px ${MONO}`;
    ctx.fillText(S.chip.label, x + size / 2, y + size / 2 + 0.5);
    ctx.globalAlpha = 1;
  }

  // --- HUD -----------------------------------------------------------------
  const pad = 26 * hs;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // top-left: what the qubit is doing right now
  ctx.font = `500 ${15 * hs}px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('|\u03c8\u27e9', pad, pad + 10 * hs);

  const p0 = (1 + v[2]) / 2;
  const barX = pad + 40 * hs;
  const barW = 108 * hs;
  const row = (name, p, color, y) => {
    ctx.font = `${10 * hs}px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(name, pad, y);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(barX, y - 7 * hs, barW, 4 * hs);
    ctx.fillStyle = color;
    ctx.fillRect(barX, y - 7 * hs, barW * p, 4 * hs);
    ctx.fillStyle = INK;
    ctx.fillText(`${Math.round(p * 100)}%`, barX + barW + 8 * hs, y);
  };
  row('P(0)', p0, RING, pad + 34 * hs);
  row('P(1)', 1 - p0, HAND, pad + 52 * hs);

  const theta = (Math.acos(clamp(v[2], -1, 1)) * 180) / Math.PI;
  const phi = (((Math.atan2(v[1], v[0]) * 180) / Math.PI) + 360) % 360;
  ctx.font = `${10 * hs}px ${MONO}`;
  ctx.fillStyle = '#8d8d8d';
  ctx.fillText(`\u03b8 ${Math.round(theta)}\u00b0   \u03c6 ${Math.round(phi)}\u00b0`, pad, pad + 74 * hs);

  // top-right: shot counter (+ a hint that vanishes after the first click)
  ctx.textAlign = 'right';
  ctx.font = `${10 * hs}px ${MONO}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`shots ${String(S.shots).padStart(3, '0')}`, w - pad, pad + 10 * hs);
  ctx.fillText(`|0\u27e9 ${S.tally[0]}   |1\u27e9 ${S.tally[1]}`, w - pad, pad + 28 * hs);
  if (!S.hinted && S.time < 14) {
    ctx.globalAlpha = (0.5 + 0.4 * Math.sin(S.time * 3)) * clamp((14 - S.time) / 2, 0, 1);
    ctx.fillStyle = RING;
    ctx.fillText('click to measure', w - pad, pad + 50 * hs);
    ctx.globalAlpha = 1;
  }

  // bottom-left: the circuit being run — same look as the Lab's wires
  const by = h - pad - 14 * hs;
  const gs = 24 * hs;
  const gap = 12 * hs;
  const startX = pad + 30 * hs;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${10 * hs}px ${MONO}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('q0', pad, by);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#8d8d8d';
  line([startX - 4 * hs, by], [startX + 5 * (gs + gap), by]);
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    const x = startX + i * (gs + gap) + gap / 2;
    const item = S.hist[i];
    if (!item) {
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, by - gs / 2, gs, gs);
      ctx.strokeStyle = '#c6c6c6';
      ctx.strokeRect(x + 0.5, by - gs / 2 + 0.5, gs - 1, gs - 1);
      ctx.restore();
      continue;
    }
    const col = item === 'M' ? HAND : RING;
    const latest = i === S.hist.length - 1;
    ctx.fillStyle = latest ? col : '#fff';
    ctx.fillRect(x, by - gs / 2, gs, gs);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = col;
    ctx.strokeRect(x + 0.6, by - gs / 2 + 0.6, gs - 1.2, gs - 1.2);
    ctx.fillStyle = latest ? '#fff' : col;
    ctx.font = `500 ${11 * hs}px ${MONO}`;
    ctx.fillText(item, x + gs / 2, by + 0.5);
  }
}

/* ---------- component ---------- */
export default function QuantumHero() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const host = canvas.parentElement || canvas;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = mq.matches;

    const S = createSim();
    if (reduced) settleStatic(S);

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let running = false;
    let onScreen = true;

    const draw = () => {
      if (w > 0 && h > 0) render(ctx, S, w, h);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw();
    };

    const frame = (now) => {
      raf = 0;
      if (!running) return;
      const dt = clamp((now - last) / 1000 || 0.016, 0, 0.05);
      last = now;
      update(S, dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    // Only animate while the hero is visible and the tab is active.
    const sync = () => (onScreen && !document.hidden ? start() : stop());

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    else window.addEventListener('resize', resize);

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          sync();
        })
      : null;
    if (io) io.observe(canvas);
    else sync();
    document.addEventListener('visibilitychange', sync);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!running) draw();
      });
    }

    // Pointer: tilt the scene, click / tap to measure.
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      S.tmx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      S.tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      S.tmx = 0;
      S.tmy = 0;
    };
    const onClick = () => {
      S.hinted = true;
      if (S.phase === 'hold' || S.phase === 'gate') S.pendingMeasure = true;
    };
    if (!reduced) {
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
      host.addEventListener('click', onClick);
    }

    return () => {
      stop();
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('click', onClick);
    };
  }, []);

  // Renders its own .hero-visual panel so the canvas centres in the right column.
  return (
    <div className="hero-visual" aria-hidden="true">
      <canvas ref={ref} className="hero-canvas" />
    </div>
  );
}
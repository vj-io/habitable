// Hand-drawn SVG path generators, ported from the brag-styles doodle engine and
// rescaled for UI sizes. Deterministic: the same seed and inputs give the same
// path string on the server and the client.

/** mulberry32: tiny seeded PRNG returning [0, 1). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (v: number) => v.toFixed(1);
const P = (x: number, y: number) => `${f(x)} ${f(y)}`;

/** Path generators bound to one seeded random stream. `wobble` scales all jitter. */
export function rough(seed = 1, wobble = 1) {
  const rnd = mulberry32(seed);
  const J = (a: number) => (rnd() - 0.5) * 2 * a * wobble;

  /** Slightly bowed line with loose endpoints. */
  function line(x1: number, y1: number, x2: number, y2: number, bow?: number) {
    const b = bow ?? Math.min(3, Math.max(0.6, Math.hypot(x2 - x1, y2 - y1) * 0.015));
    const mx = (x1 + x2) / 2 + J(b);
    const my = (y1 + y2) / 2 + J(b);
    return `M${P(x1 + J(0.8), y1 + J(0.8))} Q${P(mx, my)} ${P(x2 + J(0.8), y2 + J(0.8))}`;
  }

  /** Four separate strokes whose ends overshoot the corners, like a quick pen box. */
  function rect(x: number, y: number, w: number, h: number, overshoot = 4) {
    const o = Math.min(overshoot, w * 0.04, h * 0.08);
    return [
      line(x - o * rnd(), y, x + w + o * rnd(), y),
      line(x + w, y - o * rnd(), x + w, y + h + o * rnd()),
      line(x + w + o * rnd(), y + h, x - o * rnd(), y + h),
      line(x, y + h + o * rnd(), x, y - o * rnd()),
    ].join(" ");
  }

  /** Closed, slightly wonky quad for tint fills and offset shadows. */
  function rectFill(x: number, y: number, w: number, h: number) {
    const c = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ].map(([a, b]) => [a + J(1.2), b + J(1.2)]);
    let d = `M${P(c[0][0], c[0][1])}`;
    for (let i = 0; i < 4; i++) {
      const [a, b] = c[i];
      const [p, q] = c[(i + 1) % 4];
      d += ` Q${P((a + p) / 2 + J(1.4), (b + q) / 2 + J(1.4))} ${P(p, q)}`;
    }
    return `${d} Z`;
  }

  /** Ellipse that over-runs its start (turn > 1), like a quick circling pen. */
  function ellipse(cx: number, cy: number, rx: number, ry: number, turn = 1.1, a0 = -2.2) {
    const n = 48;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 * turn;
      const k = 1 + J(0.025) + (i / n) * 0.05;
      d += `${i ? " L" : "M"}${P(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k)}`;
    }
    return d;
  }

  const circle = (cx: number, cy: number, r: number, turn = 1.1) => ellipse(cx, cy, r, r, turn);

  /** Curved arrow; `bend` is the bow as a fraction of length (negative bends the other way). */
  function arrow(x1: number, y1: number, x2: number, y2: number, bend = 0.2, head = 9) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx = (x1 + x2) / 2 - dy * bend;
    const cy = (y1 + y2) / 2 + dx * bend;
    const a = Math.atan2(y2 - cy, x2 - cx);
    return (
      `M${P(x1 + J(0.6), y1 + J(0.6))} Q${P(cx + J(1.5), cy + J(1.5))} ${P(x2, y2)}` +
      ` M${P(x2 - Math.cos(a - 0.5) * head, y2 - Math.sin(a - 0.5) * head)} L${P(x2, y2)}` +
      ` L${P(x2 - Math.cos(a + 0.5) * head, y2 - Math.sin(a + 0.5) * head)}`
    );
  }

  const check = (x: number, y: number, s: number) =>
    `M${P(x + J(0.5), y + s * 0.52)} Q${P(x + s * 0.2, y + s * 0.68 + J(0.6))} ${P(x + s * 0.36, y + s * 0.9)}` +
    ` Q${P(x + s * 0.6 + J(0.8), y + s * 0.4)} ${P(x + s + J(0.5), y + J(0.5))}`;

  const cross = (x: number, y: number, s: number) =>
    `${line(x, y, x + s, y + s, s * 0.06)} ${line(x + s, y, x, y + s, s * 0.06)}`;

  /** Fast there-and-back underline swoosh. */
  function underline(x: number, y: number, w: number) {
    return (
      `M${P(x, y + J(0.8))} Q${P(x + w * 0.5, y - 2 + J(1.2))} ${P(x + w, y + J(1))}` +
      ` Q${P(x + w * 0.55, y + 2.5 + J(1))} ${P(x + w * 0.12, y + 3.5 + J(0.8))}`
    );
  }

  /** Back-and-forth zigzag filling a box (the doodle wipe scribble). */
  function zigzag(x: number, y: number, w: number, h: number, rows: number) {
    let d = `M${P(x, y)}`;
    for (let i = 1; i <= rows; i++) d += ` L${P(i % 2 ? x + w : x, y + (h * i) / rows + J(h / rows / 4))}`;
    return d;
  }

  /** Handwriting-like wavy lines; the last line is shorter. */
  function scribble(x: number, y: number, w: number, lines: number, gap = 18) {
    const out: string[] = [];
    for (let i = 0; i < lines; i++) {
      const ww = i === lines - 1 && lines > 1 ? w * (0.5 + rnd() * 0.2) : w * (0.9 + rnd() * 0.1);
      const yy = y + i * gap;
      let d = `M${P(x, yy)}`;
      let cx = x;
      while (cx < x + ww) {
        const st = 7 + rnd() * 5;
        d += ` Q${P(cx + st / 2, yy + J(4))} ${P(Math.min(cx + st, x + ww), yy + J(1))}`;
        cx += st;
      }
      out.push(d);
    }
    return out;
  }

  return { rnd, line, rect, rectFill, ellipse, circle, arrow, check, cross, underline, zigzag, scribble };
}

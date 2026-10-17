// Interactive topology field for the hero: grid-snapped nodes, orthogonal links and
// packets walking the graph. Purely decorative: nothing here represents real data.

type Pt = { x: number; y: number };
interface Node extends Pt {
  id: number;
  major: boolean;
  edges: number[];
  glow: number;
}
interface Edge {
  a: number;
  b: number;
  pts: Pt[];
  len: number;
  heat: number;
}
interface Packet {
  edge: number;
  t: number; // distance travelled along the edge, px
  dir: 1 | -1;
  speed: number;
  amber: boolean;
}

export interface Topology {
  setReveal(v: number): void;
  destroy(): void;
}

interface Options {
  reduced: boolean;
  onHover?: (label: string | null, x: number, y: number) => void;
}

const SIGNAL = '124, 240, 197';
const AMBER = '255, 180, 84';
const INK = '196, 214, 230';

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function polyLen(pts: Pt[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
  return l;
}

function pointAt(pts: Pt[], d: number): Pt {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (d <= seg || i === pts.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, Math.max(0, d / seg));
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

export function createTopology(canvas: HTMLCanvasElement, opts: Options): Topology {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setReveal() {}, destroy() {} };

  let w = 0;
  let h = 0;
  let dpr = 1;
  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let packets: Packet[] = [];
  let grid: HTMLCanvasElement | null = null;
  let reveal = opts.reduced ? 1 : 0;
  let raf = 0;
  let running = false;
  let visible = true;
  let last = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  let hovered = -1;

  function build() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const mobile = w < 760;
    const g = mobile ? 36 : 48;
    const cols = Math.floor(w / g);
    const rows = Math.floor(h / g);
    const r = rand(20120101 + cols * 31 + rows);
    const target = Math.min(mobile ? 26 : 64, Math.round((w * h) / (mobile ? 13000 : 20000)));

    // Background dot grid, cached once per resize.
    grid = document.createElement('canvas');
    grid.width = canvas.width;
    grid.height = canvas.height;
    const gctx = grid.getContext('2d')!;
    gctx.scale(dpr, dpr);
    gctx.fillStyle = `rgba(${INK}, 0.07)`;
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) gctx.fillRect(i * g + g / 2 - 0.5, j * g + g / 2 - 0.5, 1, 1);

    // Nodes biased away from the text column on desktop.
    nodes = [];
    const used = new Set<string>();
    let guard = 0;
    while (nodes.length < target && guard++ < target * 40) {
      const i = Math.floor(r() * cols);
      const j = Math.floor(r() * rows);
      const nx = i / Math.max(1, cols - 1);
      const ny = j / Math.max(1, rows - 1);
      const bias = mobile ? 0.25 + ny * 0.2 + (1 - ny) * 0.5 : Math.pow(nx, 1.4) * 0.95 + (1 - ny) * 0.15;
      if (r() > bias) continue;
      const key = `${i}:${j}`;
      if (used.has(key)) continue;
      used.add(key);
      nodes.push({ id: nodes.length, x: i * g + g / 2, y: j * g + g / 2, major: r() < 0.16, edges: [], glow: 0 });
    }

    // Link each node to its nearest neighbours with Manhattan routes.
    edges = [];
    const seen = new Set<string>();
    for (const n of nodes) {
      const near = nodes
        .filter((m) => m !== n)
        .map((m) => ({ m, d: Math.hypot(m.x - n.x, m.y - n.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { m, d } of near) {
        if (d > g * 6) continue;
        const key = n.id < m.id ? `${n.id}-${m.id}` : `${m.id}-${n.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const corner = r() < 0.5 ? { x: m.x, y: n.y } : { x: n.x, y: m.y };
        const pts = [{ x: n.x, y: n.y }, corner, { x: m.x, y: m.y }];
        const e: Edge = { a: n.id, b: m.id, pts, len: polyLen(pts), heat: 0 };
        n.edges.push(edges.length);
        m.edges.push(edges.length);
        edges.push(e);
      }
    }

    packets = [];
    const count = Math.round(edges.length * (mobile ? 0.35 : 0.45));
    for (let k = 0; k < count && edges.length; k++) {
      const ei = Math.floor(r() * edges.length);
      packets.push({
        edge: ei,
        t: r() * edges[ei].len,
        dir: r() < 0.5 ? 1 : -1,
        speed: 28 + r() * 70,
        amber: r() < 0.12,
      });
    }
  }

  function step(dt: number) {
    for (const p of packets) {
      const e = edges[p.edge];
      p.t += p.speed * dt;
      if (p.t >= e.len) {
        // Arrive at a node, pick a connected edge and keep walking.
        const at = nodes[p.dir === 1 ? e.b : e.a];
        at.glow = 1;
        const options = at.edges.filter((x) => x !== p.edge);
        const next = options.length ? options[Math.floor(Math.random() * options.length)] : p.edge;
        const ne = edges[next];
        p.edge = next;
        p.t = 0;
        p.dir = ne.a === at.id ? 1 : -1;
      }
    }
    for (const n of nodes) n.glow *= Math.pow(0.04, dt);
  }

  function draw() {
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    if (grid) ctx!.drawImage(grid, 0, 0);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sweep = reveal * (w + 200) - 100;
    const px = pointer.x;
    const py = pointer.y;
    const R = 180;

    // Edges
    ctx!.lineWidth = 1;
    for (const e of edges) {
      const a = nodes[e.a];
      const b = nodes[e.b];
      if (Math.min(a.x, b.x) > sweep) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const near = pointer.active ? Math.max(0, 1 - Math.hypot(mx - px, my - py) / (R * 1.3)) : 0;
      e.heat += (near - e.heat) * 0.12;
      ctx!.strokeStyle = `rgba(${e.heat > 0.05 ? SIGNAL : INK}, ${0.1 + e.heat * 0.4})`;
      ctx!.beginPath();
      ctx!.moveTo(e.pts[0].x, e.pts[0].y);
      for (let i = 1; i < e.pts.length; i++) ctx!.lineTo(e.pts[i].x, e.pts[i].y);
      ctx!.stroke();
    }

    // Packets with short trails
    for (const p of packets) {
      const e = edges[p.edge];
      const a = nodes[e.a];
      const b = nodes[e.b];
      if (Math.min(a.x, b.x) > sweep) continue;
      const pts = p.dir === 1 ? e.pts : [...e.pts].reverse();
      const head = pointAt(pts, p.t);
      const tail = pointAt(pts, Math.max(0, p.t - 22));
      const col = p.amber ? AMBER : SIGNAL;
      const grad = ctx!.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, `rgba(${col}, 0)`);
      grad.addColorStop(1, `rgba(${col}, 0.9)`);
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.moveTo(tail.x, tail.y);
      // follow the corner if the trail crosses it
      const c = pts[1];
      const passed = Math.abs(c.x - pts[0].x) + Math.abs(c.y - pts[0].y);
      if (p.t > passed && p.t - 22 < passed) ctx!.lineTo(c.x, c.y);
      ctx!.lineTo(head.x, head.y);
      ctx!.stroke();
      ctx!.fillStyle = `rgba(${col}, 1)`;
      ctx!.fillRect(head.x - 1.5, head.y - 1.5, 3, 3);
    }

    // Nodes
    let best = -1;
    let bestD = 110;
    for (const n of nodes) {
      if (n.x > sweep) continue;
      const d = pointer.active ? Math.hypot(n.x - px, n.y - py) : 9999;
      const near = Math.max(0, 1 - d / R);
      if (d < bestD) {
        bestD = d;
        best = n.id;
      }
      const s = n.major ? 7 : 4;
      const alpha = 0.35 + near * 0.6 + n.glow * 0.5;
      ctx!.fillStyle = '#07090c';
      ctx!.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      ctx!.strokeStyle = `rgba(${near > 0.1 || n.glow > 0.2 ? SIGNAL : INK}, ${Math.min(1, alpha)})`;
      ctx!.lineWidth = 1;
      ctx!.strokeRect(n.x - s / 2 + 0.5, n.y - s / 2 + 0.5, s - 1, s - 1);
      if (n.major) {
        ctx!.fillStyle = `rgba(${SIGNAL}, ${0.5 + n.glow * 0.5})`;
        ctx!.fillRect(n.x - 1, n.y - 1, 2, 2);
      }
    }

    // Scan line during reveal
    if (reveal > 0 && reveal < 1) {
      const g = ctx!.createLinearGradient(sweep - 120, 0, sweep, 0);
      g.addColorStop(0, `rgba(${SIGNAL}, 0)`);
      g.addColorStop(1, `rgba(${SIGNAL}, 0.12)`);
      ctx!.fillStyle = g;
      ctx!.fillRect(sweep - 120, 0, 120, h);
      ctx!.fillStyle = `rgba(${SIGNAL}, 0.6)`;
      ctx!.fillRect(sweep, 0, 1, h);
    }

    // Pointer lock-on
    if (pointer.active && best >= 0) {
      const n = nodes[best];
      const s = 18;
      ctx!.strokeStyle = `rgba(${SIGNAL}, 0.9)`;
      ctx!.lineWidth = 1;
      const k = 5;
      const x0 = n.x - s / 2;
      const y0 = n.y - s / 2;
      ctx!.beginPath();
      ctx!.moveTo(x0, y0 + k);
      ctx!.lineTo(x0, y0);
      ctx!.lineTo(x0 + k, y0);
      ctx!.moveTo(x0 + s - k, y0);
      ctx!.lineTo(x0 + s, y0);
      ctx!.lineTo(x0 + s, y0 + k);
      ctx!.moveTo(x0 + s, y0 + s - k);
      ctx!.lineTo(x0 + s, y0 + s);
      ctx!.lineTo(x0 + s - k, y0 + s);
      ctx!.moveTo(x0 + k, y0 + s);
      ctx!.lineTo(x0, y0 + s);
      ctx!.lineTo(x0, y0 + s - k);
      ctx!.stroke();
      ctx!.setLineDash([2, 4]);
      ctx!.strokeStyle = `rgba(${SIGNAL}, 0.35)`;
      ctx!.beginPath();
      ctx!.moveTo(px, py);
      ctx!.lineTo(n.x, py);
      ctx!.lineTo(n.x, n.y);
      ctx!.stroke();
      ctx!.setLineDash([]);
      ctx!.font = '10px "JetBrains Mono Variable", ui-monospace, monospace';
      ctx!.fillStyle = `rgba(${SIGNAL}, 0.9)`;
      ctx!.fillText(`n.${String(n.id).padStart(2, '0')}`, n.x + 14, n.y - 10);
    }
    if (best !== hovered) {
      hovered = best;
      opts.onHover?.(best >= 0 ? `n.${String(best).padStart(2, '0')}` : null, px, py);
    }
  }

  function frame(t: number) {
    if (!running) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || opts.reduced || !visible || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  build();
  draw();

  let rt = 0;
  const onResize = () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const before = w;
      const rect = canvas.getBoundingClientRect();
      // Ignore mobile URL-bar height jitter.
      if (Math.round(rect.width) === before && Math.abs(rect.height - h) < 120) return;
      build();
      draw();
    }, 150);
  };
  window.addEventListener('resize', onResize);

  const host = canvas.parentElement!;
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ev.clientX - rect.left;
    pointer.y = ev.clientY - rect.top;
    pointer.active = true;
    opts.onHover?.(hovered >= 0 ? `n.${String(hovered).padStart(2, '0')}` : null, pointer.x, pointer.y);
    if (opts.reduced) draw();
  };
  const onLeave = () => {
    pointer.active = false;
    if (opts.reduced) draw();
  };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0 },
  );
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  start();

  return {
    setReveal(v: number) {
      reveal = v;
      if (!running) draw();
    },
    destroy() {
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    },
  };
}

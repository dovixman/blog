/**
 * "System" — a procedural architecture piece.
 *
 * A single instanced mesh of modules that morphs between four states:
 *   0  monolith     — a dense voxel block, some modules slide out like rack units
 *   1  distributed  — the block decomposes into service clusters linked by a graph
 *   2  layers       — seven stacked slabs (one per career role)
 *   3  recomposed   — an airy lattice: the same system, re-assembled
 *
 * Everything is generated in code: no textures, no models.
 */
import {
  BufferAttribute,
  BufferGeometry,
  BoxGeometry,
  Color,
  Fog,
  GridHelper,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  Object3D,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
  AdditiveBlending,
} from 'three';

const BG = new Color('#0a0a0b');
const FG = new Color('#ece9e2');
const ACCENT = new Color('#ff5b22');
const LAYERS = 7;

const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const vertexShader = /* glsl */ `
  attribute vec3 aGrid;
  attribute vec3 aNet;
  attribute vec3 aLayer;
  attribute vec3 aOut;
  attribute vec4 aRand;
  attribute float aLayerIdx;

  uniform float uMorph;
  uniform float uTime;
  uniform float uActive;
  uniform float uActiveAmt;

  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vAccent;
  varying float vActive;

  float stage(float m, float k) {
    float t = clamp((m - k) * 1.6 - aRand.x * 0.6, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    float t1 = stage(uMorph, 0.0);
    float t2 = stage(uMorph, 1.0);
    float t3 = stage(uMorph, 2.0);

    // positions per state
    vec3 drawer = aOut * pow(max(0.0, sin(uTime * 0.55 + aRand.y * 40.0) - 0.82) / 0.18, 1.6) * 2.4;
    vec3 p = aGrid + drawer * (1.0 - t1);
    p = mix(p, aNet, t1);
    p = mix(p, aLayer, t2);
    p = mix(p, aGrid * 1.12, t3);

    // flight arc while moving between states
    float travel = sin(t1 * 3.14159) + sin(t2 * 3.14159) + sin(t3 * 3.14159);
    p += (aRand.yzw - 0.5) * travel * 3.0;

    // breathing in the distributed state
    float netness = t1 * (1.0 - t2);
    p.y += sin(uTime * 0.9 + aRand.y * 6.2831) * 0.12 * netness;

    // scale per state
    vec3 s = mix(vec3(0.88), vec3(0.46), t1);
    s = mix(s, vec3(0.84, 0.12, 0.84), t2);
    s = mix(s, vec3(0.34), t3);

    // active layer lift
    float act = (1.0 - smoothstep(0.0, 0.55, abs(aLayerIdx - uActive))) * t2 * (1.0 - t3) * uActiveAmt;
    p.y += act * 0.35;
    s.y += act * 0.08;

    vec3 local = position * s;
    vec4 world = modelMatrix * vec4(p + local, 1.0);

    vLocal = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vWorld = world.xyz;
    vAccent = step(0.982, aRand.w) * (1.0 - t2 * (1.0 - t3));
    vActive = act;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBg;
  uniform vec3 uFg;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uScan;
  uniform float uDim;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vAccent;
  varying float vActive;

  void main() {
    // edge mask from the local box coordinates (crisp, screen-space width)
    vec3 a = abs(vLocal) * 2.0;
    float mx = max(a.x, max(a.y, a.z));
    float mn = min(a.x, min(a.y, a.z));
    float mid = a.x + a.y + a.z - mx - mn;
    float w = fwidth(mid);
    float edge = smoothstep(1.0 - 2.2 * w, 1.0 - 0.4 * w, mid);

    vec3 n = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(vec3(-0.45, 0.85, 0.4));
    float diff = max(dot(n, L), 0.0);
    float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);

    // scanning plane sweeping through the system
    float scan = exp(-pow((vWorld.y - uScan) * 1.6, 2.0));

    vec3 face = mix(uBg * 1.25, vec3(0.13, 0.13, 0.135), diff);
    face *= 0.7 + 0.45 * smoothstep(-9.0, 9.0, vWorld.y);
    face += rim * 0.05;
    face += uFg * scan * 0.035;

    float pulse = 0.55 + 0.45 * sin(uTime * 2.2 + vWorld.x * 0.7);
    face = mix(face, uAccent * (0.32 + 0.3 * pulse), vAccent * 0.85);
    face = mix(face, mix(uFg * 0.22, uAccent * 0.8, 0.35), vActive);

    vec3 edgeCol = mix(uFg, uAccent, max(vAccent, vActive * 0.8));
    float edgeAmt = 0.26 + scan * 0.9 + vActive * 0.7 + vAccent * 0.4;
    vec3 col = mix(face, edgeCol, edge * clamp(edgeAmt, 0.0, 1.0));

    float depth = length(cameraPosition - vWorld);
    float fog = smoothstep(uFogNear, uFogFar, depth);
    col = mix(col, uBg, fog);
    col = mix(uBg, col, uDim);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const lineVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  varying float vDepth;
  void main() {
    vT = aT;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const lineFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying float vT;
  varying float vDepth;
  void main() {
    float dash = step(0.5, fract(vT * 24.0 - uTime * 0.6));
    float a = uOpacity * (0.35 + 0.65 * dash) * (1.0 - smoothstep(24.0, 52.0, vDepth));
    gl_FragColor = vec4(uColor, a);
  }
`;

const packetVertex = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vFade;
  void main() {
    float t = fract(uTime * (0.08 + aSeed * 0.12) + aSeed * 7.0);
    vec3 p = mix(aFrom, aTo, t);
    vFade = sin(t * 3.14159);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (24.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const packetFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (max(abs(c.x), abs(c.y)) > 0.5) discard;
    gl_FragColor = vec4(uColor, uOpacity * vFade);
  }
`;

export function createScene(canvas, { mobile = false, reduced = false } = {}) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(BG, 1);
  const dprCap = mobile ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  const scene = new Scene();
  scene.fog = new Fog(BG, 22, 56);
  const camera = new PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(0, 0, 34);

  const root = new Group();
  scene.add(root);
  const system = new Group();
  root.add(system);

  // ---------- layouts ----------
  const G = mobile ? 6 : 9;
  const N = G * G * G;
  const K = mobile ? 8 : 14;
  const rand = mulberry32(1337);

  const aGrid = new Float32Array(N * 3);
  const aNet = new Float32Array(N * 3);
  const aLayer = new Float32Array(N * 3);
  const aOut = new Float32Array(N * 3);
  const aRand = new Float32Array(N * 4);
  const aLayerIdx = new Float32Array(N);

  const half = (G - 1) / 2;

  // cluster centres on a flattened Fibonacci sphere
  const centres = [];
  const R = mobile ? 6.6 : 10.2;
  for (let c = 0; c < K; c++) {
    const y = 1 - (c / (K - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = c * Math.PI * (3 - Math.sqrt(5));
    const jitter = 0.85 + rand() * 0.3;
    centres.push(new Vector3(Math.cos(phi) * r * R * jitter, y * R * 0.62, Math.sin(phi) * r * R * jitter));
  }
  const perCluster = Math.ceil(N / K);
  const cs = Math.ceil(Math.cbrt(perCluster));
  const perLayer = Math.ceil(N / LAYERS);
  const q = Math.ceil(Math.sqrt(perLayer));

  for (let i = 0; i < N; i++) {
    const x = i % G;
    const y = Math.floor(i / G) % G;
    const z = Math.floor(i / (G * G));
    const gx = x - half;
    const gy = y - half;
    const gz = z - half;
    aGrid.set([gx, gy, gz], i * 3);

    // surface modules can slide out along their dominant axis
    const ax = Math.abs(gx);
    const ay = Math.abs(gy);
    const az = Math.abs(gz);
    if (Math.max(ax, ay, az) === half && rand() > 0.55) {
      if (ax === half) aOut.set([Math.sign(gx), 0, 0], i * 3);
      else if (az === half) aOut.set([0, 0, Math.sign(gz)], i * 3);
      else aOut.set([0, Math.sign(gy), 0], i * 3);
    }

    // distributed
    const c = i % K;
    const j = Math.floor(i / K);
    const lx = (j % cs) - (cs - 1) / 2;
    const ly = (Math.floor(j / cs) % cs) - (cs - 1) / 2;
    const lz = Math.floor(j / (cs * cs)) - (cs - 1) / 2;
    const sp = 0.56;
    aNet.set([centres[c].x + lx * sp, centres[c].y + ly * sp, centres[c].z + lz * sp], i * 3);

    // layers
    const l = i % LAYERS;
    const k = Math.floor(i / LAYERS);
    const tx = (k % q) - (q - 1) / 2;
    const tz = Math.floor(k / q) - (q - 1) / 2;
    aLayer.set([tx * 0.94, (l - (LAYERS - 1) / 2) * 1.6, tz * 0.94], i * 3);
    aLayerIdx[i] = l;

    aRand.set([rand(), rand(), rand(), rand()], i * 4);
  }

  const box = new BoxGeometry(1, 1, 1);
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uActive: { value: LAYERS - 1 },
      uActiveAmt: { value: 0 },
      uScan: { value: 0 },
      uDim: { value: 1 },
      uBg: { value: BG },
      uFg: { value: FG },
      uAccent: { value: ACCENT },
      uFogNear: { value: 26 },
      uFogFar: { value: 52 },
    },
  });
  const mesh = new InstancedMesh(box, material, N);
  const identity = new Object3D();
  identity.updateMatrix();
  for (let i = 0; i < N; i++) mesh.setMatrixAt(i, identity.matrix);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  box.setAttribute('aGrid', new InstancedBufferAttribute(aGrid, 3));
  box.setAttribute('aNet', new InstancedBufferAttribute(aNet, 3));
  box.setAttribute('aLayer', new InstancedBufferAttribute(aLayer, 3));
  box.setAttribute('aOut', new InstancedBufferAttribute(aOut, 3));
  box.setAttribute('aRand', new InstancedBufferAttribute(aRand, 4));
  box.setAttribute('aLayerIdx', new InstancedBufferAttribute(aLayerIdx, 1));
  system.add(mesh);

  // ---------- graph edges between clusters ----------
  const edges = [];
  const seen = new Set();
  centres.forEach((a, ia) => {
    const near = centres
      .map((b, ib) => ({ ib, d: a.distanceTo(b) }))
      .filter((o) => o.ib !== ia)
      .sort((u, v) => u.d - v.d)
      .slice(0, 3);
    near.forEach(({ ib }) => {
      const key = ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([ia, ib]);
      }
    });
  });
  const SEG = 24;
  const linePos = new Float32Array(edges.length * SEG * 2 * 3);
  const lineT = new Float32Array(edges.length * SEG * 2);
  let o = 0;
  edges.forEach(([ia, ib]) => {
    const a = centres[ia];
    const b = centres[ib];
    for (let s = 0; s < SEG; s++) {
      const t0 = s / SEG;
      const t1 = (s + 1) / SEG;
      // orthogonal routing feel: travel in x/z first, then y (like a circuit trace)
      const p0 = route(a, b, t0);
      const p1 = route(a, b, t1);
      linePos.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z], o * 6);
      lineT.set([t0, t1], o * 2);
      o++;
    }
  });
  function route(a, b, t) {
    const mid = new Vector3(b.x, a.y, b.z);
    if (t < 0.5) return a.clone().lerp(mid, t * 2);
    return mid.clone().lerp(b, (t - 0.5) * 2);
  }
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new BufferAttribute(linePos, 3));
  lineGeo.setAttribute('aT', new BufferAttribute(lineT, 1));
  const lineMat = new ShaderMaterial({
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: FG }, uOpacity: { value: 0 }, uTime: { value: 0 } },
  });
  const lines = new LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  system.add(lines);

  // packets travelling along the graph (orthogonal: two legs per edge)
  let packets = null;
  let packetMat = null;
  if (!mobile) {
    const P = edges.length * 2;
    const from = new Float32Array(P * 3);
    const to = new Float32Array(P * 3);
    const seed = new Float32Array(P);
    edges.forEach(([ia, ib], e) => {
      const a = centres[ia];
      const b = centres[ib];
      const mid = new Vector3(b.x, a.y, b.z);
      const flip = rand() > 0.5;
      const s = flip ? b : a;
      const t = flip ? a : b;
      const m = flip ? new Vector3(a.x, b.y, a.z) : mid;
      from.set([s.x, s.y, s.z], e * 6);
      to.set([m.x, m.y, m.z], e * 6);
      from.set([m.x, m.y, m.z], e * 6 + 3);
      to.set([t.x, t.y, t.z], e * 6 + 3);
      seed[e * 2] = rand();
      seed[e * 2 + 1] = rand();
    });
    const pg = new BufferGeometry();
    pg.setAttribute('position', new BufferAttribute(new Float32Array(P * 3), 3));
    pg.setAttribute('aFrom', new BufferAttribute(from, 3));
    pg.setAttribute('aTo', new BufferAttribute(to, 3));
    pg.setAttribute('aSeed', new BufferAttribute(seed, 1));
    packetMat = new ShaderMaterial({
      vertexShader: packetVertex,
      fragmentShader: packetFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: ACCENT },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 5 * renderer.getPixelRatio() },
      },
    });
    packets = new Points(pg, packetMat);
    packets.frustumCulled = false;
    system.add(packets);
  }

  // blueprint floor
  const grid = new GridHelper(120, 60, 0x2a2a2c, 0x1a1a1c);
  grid.position.y = -11;
  grid.material.transparent = true;
  grid.material.opacity = 0.6;
  root.add(grid);

  // ---------- state ----------
  const target = { morph: 0, x: 0, y: 0, scale: 1, tilt: 0.42, spin: 0, dim: 1, active: LAYERS - 1, activeAmt: 0 };
  const current = { ...target };
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
  let width = 1;
  let height = 1;
  let time = 0;
  let running = false;
  let raf = 0;
  let last = 0;
  let frames = 0;
  let fpsT = 0;
  let fps = 0;
  let onFps = null;

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // keep the piece framed on narrow screens
    camera.position.z = camera.aspect < 0.8 ? 46 : camera.aspect < 1.2 ? 40 : 34;
    camera.updateProjectionMatrix();
    if (!running) render(0);
  }

  function apply(dt) {
    const k = reduced ? 1 : null;
    for (const key of Object.keys(target)) {
      if (key === 'active') continue;
      const lambda = key === 'morph' ? 2.4 : 3.2;
      current[key] = k ? target[key] : damp(current[key], target[key], lambda, dt);
    }
    current.active = reduced ? target.active : damp(current.active, target.active, 6, dt);

    const u = material.uniforms;
    u.uMorph.value = current.morph;
    u.uTime.value = time;
    u.uActive.value = current.active;
    u.uActiveAmt.value = current.activeAmt;
    u.uDim.value = current.dim;
    u.uScan.value = reduced ? 2 : ((time * 0.11) % 1) * 26 - 13;

    const m = current.morph;
    const netness = Math.max(0, Math.min(1, (m - 0.55) * 2.5)) * Math.max(0, Math.min(1, (1.55 - m) * 2.5));
    lineMat.uniforms.uOpacity.value = 0.6 * netness * current.dim;
    lineMat.uniforms.uTime.value = time;
    if (packetMat) {
      packetMat.uniforms.uOpacity.value = netness * current.dim;
      packetMat.uniforms.uTime.value = time;
    }
    grid.material.opacity = 0.55 * current.dim;

    root.position.set(current.x, current.y, 0);
    root.scale.setScalar(current.scale);
    system.rotation.x = current.tilt;
    system.rotation.y = (reduced ? 0.6 : time * 0.045) + current.spin;

    pointer.cx = damp(pointer.cx, pointer.x, 2.5, dt);
    pointer.cy = damp(pointer.cy, pointer.y, 2.5, dt);
    camera.position.x = pointer.cx * 2.2;
    camera.position.y = pointer.cy * 1.4;
    camera.lookAt(0, 0, 0);
  }

  function render(dt) {
    apply(dt);
    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    time += dt;
    render(dt);
    frames++;
    fpsT += dt;
    if (fpsT >= 0.5) {
      fps = Math.round(frames / fpsT);
      frames = 0;
      fpsT = 0;
      onFps && onFps(fps);
    }
  }

  function start() {
    if (running || reduced) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    onFps && onFps(0);
  }

  window.addEventListener('resize', resize, { passive: true });
  if (!mobile && !reduced) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true }
    );
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  resize();

  return {
    set(next) {
      Object.assign(target, next);
      if (reduced) render(0);
    },
    snap() {
      Object.assign(current, target);
      render(0);
    },
    start,
    stop,
    get running() {
      return running;
    },
    onFps(fn) {
      onFps = fn;
    },
    resize,
  };
}

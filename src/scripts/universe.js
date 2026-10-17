// Immersive Digital Universe — a procedural solar system where every planet is
// a discipline. The camera travels between "stations" driven by scroll.
// Everything is generated at runtime: geometry, shaders, stars. No textures.

import * as THREE from 'three';
import { noise3 } from './glsl.js';

THREE.ColorManagement.enabled = false;

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/* ------------------------------------------------------------------------ */
/* Shaders                                                                   */
/* ------------------------------------------------------------------------ */

const planetVert = /* glsl */ `
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vWorld;
void main(){
  vPos = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const planetFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uAccent;
uniform float uSeed;
uniform float uMode;   // 0 rocky · 1 banded · 2 blueprint · 3 circuit · 4 core
uniform float uFocus;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vWorld;
${noise3}
float gridLine(float x, float w){
  float f = abs(fract(x) - 0.5);
  return 1.0 - smoothstep(0.5 - w, 0.5, f);
}
void main(){
  vec3 p = normalize(vPos);
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(-vWorld);           // the sun sits at the origin
  vec3 V = normalize(cameraPosition - vWorld);
  float n;
  if (uMode > 0.5 && uMode < 1.5) {
    float warp = fbm(p * 2.4 + uSeed + vec3(uTime * 0.01, 0.0, 0.0));
    n = 0.5 + 0.5 * sin((p.y * 7.0 + warp * 2.6) * 3.14159);
    n = mix(n, warp, 0.35);
  } else {
    n = fbm(p * 2.3 + uSeed);
  }
  vec3 col = mix(uA, uB, smoothstep(0.32, 0.62, n));
  col = mix(col, uC, smoothstep(0.64, 0.82, n));

  float ndl = dot(N, L);
  float day = smoothstep(-0.18, 0.42, ndl);
  vec3 lit = col * (0.06 + 1.12 * day);

  // Night-side emission: each discipline has its own "city lights" pattern
  float lon = atan(p.z, p.x);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float pattern = 0.0;
  if (uMode > 1.5 && uMode < 2.5) {
    // blueprint grid
    float g = max(gridLine(lon * 18.0 / 6.2831, 0.035), gridLine(lat * 9.0 / 3.1416, 0.035));
    pattern = g * (0.35 + 0.65 * (1.0 - day));
    lit += uAccent * pattern * 0.55;
  } else if (uMode > 2.5 && uMode < 3.5) {
    // circuit traces
    vec3 q = p * 6.0 + uSeed;
    float c = abs(snoise(floor(q * 2.0) * 0.5 + 0.3));
    float tr = gridLine(lon * 40.0 / 6.2831 + floor(lat * 20.0) * 0.5, 0.06) * step(0.55, c);
    tr += gridLine(lat * 20.0 / 3.1416, 0.05) * step(0.6, abs(snoise(q * 1.3)));
    float pulse = 0.6 + 0.4 * sin(uTime * 2.0 + lon * 6.0);
    pattern = clamp(tr, 0.0, 1.0) * pulse;
    lit += uAccent * pattern * (0.25 + 0.75 * (1.0 - day));
  } else {
    float cities = smoothstep(0.62, 0.78, fbm(p * 9.0 + uSeed * 3.0));
    lit += uAccent * cities * (1.0 - day) * 0.55;
  }

  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  lit += uAccent * fres * (0.18 + 0.82 * smoothstep(-0.4, 0.6, ndl)) * (0.75 + 0.5 * uFocus);
  if (uMode > 3.5) {
    lit = uA * 0.4 + uAccent * fres * 1.4;
  }
  gl_FragColor = vec4(lit, 1.0);
}`;

const atmoVert = /* glsl */ `
varying vec3 vN;
varying vec3 vWorld;
void main(){
  vN = normalize(normalMatrix * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const atmoFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
uniform float uStrength;
uniform float uSpread;
varying vec3 vN;
varying vec3 vWorld;
void main(){
  // back faces only: -vN.z is 1 behind the planet centre and 0 at the halo edge
  float k = clamp(-normalize(vN).z * uSpread, 0.0, 1.0);
  float glow = pow(k, uPower) * uStrength;
  gl_FragColor = vec4(uColor * glow, glow);
}`;

const sunFrag = /* glsl */ `
uniform float uTime;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vWorld;
${noise3}
void main(){
  vec3 p = normalize(vPos);
  vec3 V = normalize(cameraPosition - vWorld);
  float mu = max(dot(normalize(vNormalW), V), 0.0);
  float t = uTime * 0.04;
  float n = fbm(p * 3.2 + vec3(t, -t * 0.7, t * 0.4));
  float cells = fbm(p * 11.0 - vec3(t * 2.0));
  float heat = n * 0.75 + cells * 0.35;
  vec3 c1 = vec3(0.62, 0.14, 0.02);
  vec3 c2 = vec3(1.0, 0.52, 0.16);
  vec3 c3 = vec3(1.0, 0.86, 0.58);
  vec3 c4 = vec3(1.0, 0.98, 0.92);
  vec3 col = mix(c1, c2, smoothstep(0.25, 0.55, heat));
  col = mix(col, c3, smoothstep(0.55, 0.78, heat));
  col = mix(col, c4, smoothstep(0.8, 0.98, heat));
  col *= 0.55 + 0.6 * pow(mu, 0.45);              // limb darkening
  col += vec3(1.0, 0.55, 0.2) * pow(1.0 - mu, 3.0) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

const coronaVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const coronaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uInner;
uniform float uIntensity;
varying vec2 vUv;
${noise3}
void main(){
  vec2 q = vUv * 2.0 - 1.0;
  float r = length(q);
  float a = atan(q.y, q.x);
  float rays = fbm(vec3(cos(a) * 2.2, sin(a) * 2.2, uTime * 0.05 + r * 0.6));
  float x = max(r - uInner, 0.0) / (1.0 - uInner);
  float glow = exp(-x * 4.5) * (0.45 + rays * 0.9) + exp(-x * 16.0) * 0.7;
  glow *= smoothstep(1.0, 0.6, r);
  gl_FragColor = vec4(uColor * glow * uIntensity, 1.0);
}`;

const pointsVert = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
uniform float uAtten;
varying vec3 vColor;
varying float vTw;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 1.7) + aPhase * 40.0);
  vTw = tw;
  vColor = aColor;
  float s = aSize * uPixelRatio;
  if (uAtten > 0.5) s *= 18.0 / -mv.z;
  gl_PointSize = clamp(s, 0.0, 64.0);
  gl_Position = projectionMatrix * mv;
}`;

const pointsFrag = /* glsl */ `
varying vec3 vColor;
varying float vTw;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = pow(a, 1.8);
  gl_FragColor = vec4(vColor * a * vTw, a * vTw);
}`;

const nebulaVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const nebulaFrag = /* glsl */ `
varying vec3 vDir;
${noise3}
void main(){
  vec3 d = normalize(vDir);
  float n1 = fbm(d * 1.6 + vec3(3.0, 1.0, 7.0));
  float n2 = fbm(d * 3.1 - vec3(1.2, 4.0, 2.0));
  vec3 base = vec3(0.012, 0.016, 0.04);
  vec3 violet = vec3(0.26, 0.12, 0.44);
  vec3 teal = vec3(0.04, 0.22, 0.30);
  vec3 ember = vec3(0.36, 0.12, 0.08);
  float band = exp(-pow(d.y * 2.6 + (n1 - 0.5) * 1.6, 2.0));
  vec3 col = base;
  col += violet * smoothstep(0.45, 0.85, n1) * 0.55;
  col += teal * smoothstep(0.5, 0.9, n2) * 0.5;
  col += ember * band * smoothstep(0.4, 0.8, n2) * 0.35;
  col += vec3(0.05, 0.06, 0.1) * band * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

const boxVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main(){
  vUv = uv;
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vN = normalize(mat3(m) * normal);
  gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.0);
}`;

const boxFrag = /* glsl */ `
uniform vec3 uAccent;
uniform float uTime;
varying vec2 vUv;
varying vec3 vN;
void main(){
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = 1.0 - smoothstep(0.0, 0.07, min(e.x, e.y));
  float shade = 0.35 + 0.65 * max(dot(vN, normalize(vec3(-0.4, 0.8, 0.5))), 0.0);
  vec3 fill = mix(vec3(0.02, 0.03, 0.07), uAccent * 0.22, shade);
  vec3 col = fill + uAccent * edge * 1.1;
  gl_FragColor = vec4(col, 1.0);
}`;

const ringFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uInner;
uniform float uOuter;
varying vec3 vLocal;
${noise3}
void main(){
  float r = length(vLocal.xy);
  float t = (r - uInner) / (uOuter - uInner);
  float bands = fbm(vec3(t * 14.0, 0.0, 1.7));
  float a = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.85, t);
  a *= 0.25 + 0.75 * smoothstep(0.35, 0.75, bands);
  a *= 1.0 - 0.6 * smoothstep(0.42, 0.46, t) * smoothstep(0.52, 0.48, t);
  gl_FragColor = vec4(uColor * (0.6 + bands * 0.8) * a, a * 0.85);
}`;

const ringVert = /* glsl */ `
varying vec3 vLocal;
void main(){
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const shieldVert = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vWorld;
void main(){
  vPos = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const shieldFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vWorld;
float hexDist(vec2 p){
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.73205))), p.x);
}
vec4 hexCoords(vec2 uv){
  vec2 r = vec2(1.0, 1.73205);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  return vec4(gv, uv - gv);
}
void main(){
  vec3 p = normalize(vPos);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vN);
  float fres = pow(1.0 - abs(dot(N, V)), 2.2);
  vec2 uv = vec2(atan(p.z, p.x) * 3.8, asin(clamp(p.y, -1.0, 1.0)) * 4.4);
  vec4 hc = hexCoords(uv * 1.6);
  float d = hexDist(hc.xy);
  float line = smoothstep(0.42, 0.49, d);
  float id = fract(sin(dot(hc.zw, vec2(12.9898, 78.233))) * 43758.5453);
  float scan = exp(-pow((p.y - sin(uTime * 0.6) * 0.95) * 6.0, 2.0));
  float flicker = step(0.92, fract(id * 7.0 + uTime * 0.25));
  float polar = smoothstep(0.98, 0.8, abs(p.y));
  float a = (line * (0.25 + 0.75 * fres) + scan * 0.35 * (line + 0.15) + flicker * 0.18) * polar;
  a += fres * 0.25;
  gl_FragColor = vec4(uColor * a, a);
}`;

const neuralLineVert = /* glsl */ `
attribute float aPhase;
attribute float aT;
varying float vPhase;
varying float vT;
void main(){
  vPhase = aPhase;
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const neuralLineFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying float vPhase;
varying float vT;
void main(){
  float x = fract(uTime * 0.45 + vPhase);
  float d = vT - (x * 1.6 - 0.3);
  float pulse = exp(-d * d * 60.0);
  float a = 0.2 + pulse * 0.8;
  gl_FragColor = vec4(uColor * a, a);
}`;

/* ------------------------------------------------------------------------ */
/* Builders                                                                  */
/* ------------------------------------------------------------------------ */

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

function makePlanetMaterial(defines, opts) {
  return new THREE.ShaderMaterial({
    defines,
    vertexShader: planetVert,
    fragmentShader: planetFrag,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(opts.a) },
      uB: { value: new THREE.Color(opts.b) },
      uC: { value: new THREE.Color(opts.c) },
      uAccent: { value: new THREE.Color(opts.accent) },
      uSeed: { value: opts.seed ?? 0 },
      uMode: { value: opts.mode ?? 0 },
      uFocus: { value: 0 },
    },
  });
}

function makeAtmosphere(radius, color, segs, power = 2.2, strength = 1.0, spread = 1.9) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: atmoVert,
    fragmentShader: atmoFrag,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uStrength: { value: strength },
      uSpread: { value: spread },
    },
    side: THREE.BackSide,
    ...additive,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, segs, Math.round(segs / 2)), mat);
}

function makeStars(count, pr) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const palette = [
    [1, 1, 1],
    [0.8, 0.88, 1],
    [1, 0.9, 0.75],
    [0.75, 0.8, 1],
  ];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * TAU;
    const r = 220 + Math.random() * 280;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(th);
    const big = Math.random() < 0.04;
    size[i] = big ? 3.2 + Math.random() * 2.2 : 0.9 + Math.random() * 1.6;
    phase[i] = Math.random();
    const c = palette[(Math.random() * palette.length) | 0];
    const b = 0.55 + Math.random() * 0.45;
    color[i * 3] = c[0] * b;
    color[i * 3 + 1] = c[1] * b;
    color[i * 3 + 2] = c[2] * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const m = new THREE.ShaderMaterial({
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pr }, uAtten: { value: 0 } },
    ...additive,
  });
  return new THREE.Points(g, m);
}

function makeDust(count, pr) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.pow(Math.random(), 0.8) * 34;
    const th = Math.random() * TAU;
    pos[i * 3] = Math.cos(th) * r;
    pos[i * 3 + 1] = (Math.random() - 0.5) * (0.4 + r * 0.04);
    pos[i * 3 + 2] = Math.sin(th) * r;
    size[i] = 0.5 + Math.random() * 1.2;
    phase[i] = Math.random();
    const warm = Math.max(0, 1 - r / 22);
    color[i * 3] = 0.5 + warm * 0.5;
    color[i * 3 + 1] = 0.55 + warm * 0.25;
    color[i * 3 + 2] = 0.8 - warm * 0.3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const m = new THREE.ShaderMaterial({
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pr }, uAtten: { value: 1 } },
    ...additive,
  });
  return new THREE.Points(g, m);
}

function orbitLine(radius, color, segs = 256) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * TAU;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.LineLoop(g, m);
}

function makeBoxMaterial(accent) {
  return new THREE.ShaderMaterial({
    vertexShader: boxVert,
    fragmentShader: boxFrag,
    uniforms: { uAccent: { value: new THREE.Color(accent) }, uTime: { value: 0 } },
  });
}

/* ------------------------------------------------------------------------ */
/* Main                                                                      */
/* ------------------------------------------------------------------------ */

export function createUniverse({ container, sections, onFail, tooltip, hud }) {
  const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const Q = mobile
    ? { stars: 1400, dust: 700, neural: 180, segs: 40, dprMax: 1.5, fbm: 3, nebulaFbm: 3 }
    : { stars: 4800, dust: 2600, neural: 420, segs: 80, dprMax: 2, fbm: 5, nebulaFbm: 4 };

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  let dpr = Math.min(window.devicePixelRatio || 1, Q.dprMax);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x05060d, 1);
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.setAttribute('tabindex', '-1');
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    onFail?.();
  });

  const fbmDefs = { FBM_OCTAVES: Q.fbm };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 52 : 40, window.innerWidth / window.innerHeight, 0.1, 2000);

  const timeUniforms = [];
  const track = (mat) => {
    if (mat.uniforms?.uTime) timeUniforms.push(mat.uniforms.uTime);
    return mat;
  };

  // Backdrop ---------------------------------------------------------------
  const nebula = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.ShaderMaterial({
      defines: { FBM_OCTAVES: Q.nebulaFbm },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  scene.add(nebula);

  const stars = makeStars(Q.stars, dpr);
  track(stars.material);
  scene.add(stars);

  const dust = makeDust(Q.dust, dpr);
  track(dust.material);
  scene.add(dust);

  // Sun --------------------------------------------------------------------
  const SUN_R = 3.2;
  const sunMat = track(
    new THREE.ShaderMaterial({
      defines: fbmDefs,
      vertexShader: planetVert,
      fragmentShader: sunFrag,
      uniforms: { uTime: { value: 0 } },
    })
  );
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, Q.segs, Q.segs / 2), sunMat);
  scene.add(sun);
  const corona = new THREE.Mesh(
    new THREE.PlaneGeometry(SUN_R * 6, SUN_R * 6),
    track(
      new THREE.ShaderMaterial({
        defines: { FBM_OCTAVES: 3 },
        vertexShader: coronaVert,
        fragmentShader: coronaFrag,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#ff9a4a') },
          uInner: { value: 0.33 },
          uIntensity: { value: 0.7 },
        },
        ...additive,
      })
    )
  );
  scene.add(corona);

  // Planets ----------------------------------------------------------------
  const DEFS = {
    arquitectura: { r: 1.45, orbit: 10.5, angle: 0.55, a: '#0b2a3f', b: '#1c6f8f', c: '#bff4ff', mode: 2, seed: 1.3 },
    liderazgo: { r: 1.85, orbit: 16, angle: 1.95, a: '#5a2a07', b: '#c9771c', c: '#ffe0a3', mode: 1, seed: 4.1 },
    ia: { r: 1.35, orbit: 21.5, angle: 3.35, a: '#0c0720', b: '#2a1856', c: '#7c5cd6', mode: 4, seed: 7.7 },
    ciberseguridad: { r: 1.4, orbit: 27, angle: 4.7, a: '#03140d', b: '#0b3d27', c: '#2a8a5c', mode: 3, seed: 2.2 },
    laboratorios: { r: 1.1, dist: 7.6, orbit: 32.5, angle: 5.85, a: '#250a24', b: '#6d2163', c: '#ffb3ea', mode: 0, seed: 9.4 },
  };

  const planets = [];
  const hitTargets = [];
  const animators = [];

  sections.forEach((sec) => {
    const def = DEFS[sec.id];
    if (!def) return;
    const accent = sec.accent;
    const group = new THREE.Group();
    group.position.set(Math.cos(def.angle) * def.orbit, 0, Math.sin(def.angle) * def.orbit);
    scene.add(group);

    const spin = new THREE.Group();
    spin.rotation.z = 0.35;
    group.add(spin);

    const mat = track(makePlanetMaterial(fbmDefs, { ...def, accent }));
    const body = new THREE.Mesh(new THREE.SphereGeometry(def.mode === 4 ? def.r * 0.62 : def.r, Q.segs, Q.segs / 2), mat);
    spin.add(body);
    const atmo = makeAtmosphere(def.r * (def.mode === 4 ? 0.78 : 1.16), accent, Q.segs / 2, 2.2, 0.85, 1.9);
    group.add(atmo);

    const orbit = orbitLine(def.orbit, accent);
    scene.add(orbit);

    const hit = new THREE.Mesh(new THREE.SphereGeometry(def.r * 2.6, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { id: sec.id, title: sec.title };
    group.add(hit);
    hitTargets.push(hit);

    const p = { id: sec.id, label: sec.label, def, group, spin, body, mat, orbit, accent, focus: 0 };
    planets.push(p);
    buildDecor(p);
  });

  function buildDecor(p) {
    const { def, group, accent } = p;
    const r = def.r;
    if (p.id === 'arquitectura') {
      const cage = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 1.6, 1)),
        new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.28, ...additive })
      );
      group.add(cage);
      const count = mobile ? 20 : 34;
      const box = new THREE.BoxGeometry(1, 1, 1);
      const inst = new THREE.InstancedMesh(box, makeBoxMaterial(accent), count);
      const ring = new THREE.Group();
      ring.rotation.set(0.42, 0, -0.28);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      const v = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        const rr = r * 2.6 + (i % 3) * 0.14;
        const h = 0.12 + ((i * 7) % 5) * 0.07;
        v.set(Math.cos(a) * rr, h * 0.5, Math.sin(a) * rr);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
        s.set(0.17, h, 0.17);
        m4.compose(v, q, s);
        inst.setMatrixAt(i, m4);
      }
      ring.add(inst);
      group.add(ring);
      animators.push((t, dt) => {
        cage.rotation.y += dt * 0.08;
        cage.rotation.x += dt * 0.03;
        ring.rotation.y += dt * 0.12;
      });
    }

    if (p.id === 'liderazgo') {
      const inner = r * 1.45;
      const outer = r * 2.5;
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, mobile ? 96 : 160, 1),
        new THREE.ShaderMaterial({
          defines: { FBM_OCTAVES: 3 },
          vertexShader: ringVert,
          fragmentShader: ringFrag,
          uniforms: { uColor: { value: new THREE.Color('#ffcf8a') }, uInner: { value: inner }, uOuter: { value: outer } },
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        })
      );
      ringMesh.rotation.x = -Math.PI / 2 + 0.38;
      ringMesh.rotation.y = 0.18;
      group.add(ringMesh);
      // Moons in formation: they share an orbit and move together.
      const formation = new THREE.Group();
      formation.rotation.set(-0.3, 0, 0.22);
      const moonMat = track(makePlanetMaterial(fbmDefs, { a: '#4a3a2c', b: '#a8927a', c: '#fff1dc', accent: '#ffb547', seed: 3.3 }));
      const moonGeo = new THREE.SphereGeometry(1, 24, 12);
      const moons = [];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(moonGeo, moonMat);
        const s = i === 0 ? 0.34 : 0.22;
        m.scale.setScalar(s);
        formation.add(m);
        moons.push({ m, offset: (i / n) * TAU });
      }
      formation.add(orbitLineLocal(r * 2.95, '#ffb547', 0.22));
      group.add(formation);
      animators.push((t) => {
        moons.forEach(({ m, offset }) => {
          const a = t * 0.22 + offset;
          m.position.set(Math.cos(a) * r * 2.95, 0, Math.sin(a) * r * 2.95);
        });
      });
    }

    if (p.id === 'ia') {
      const count = Q.neural;
      const pts = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const th = golden * i;
        const jitter = 1 + (Math.random() - 0.5) * 0.12;
        pts.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(r * 1.25 * jitter));
      }
      // inner layer
      const innerCount = Math.round(count * 0.25);
      for (let i = 0; i < innerCount; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(r * (0.7 + Math.random() * 0.3));
        pts.push(v);
      }
      const posArr = new Float32Array(pts.length * 3);
      const sizeArr = new Float32Array(pts.length);
      const phaseArr = new Float32Array(pts.length);
      const colArr = new Float32Array(pts.length * 3);
      const c = new THREE.Color(accent);
      pts.forEach((v, i) => {
        posArr.set([v.x, v.y, v.z], i * 3);
        sizeArr[i] = i < count ? 2.2 + Math.random() * 2.4 : 1.4 + Math.random();
        phaseArr[i] = Math.random();
        const w = Math.random() < 0.15 ? 1 : 0;
        colArr.set([c.r + w * 0.4, c.g + w * 0.4, c.b + w * 0.2], i * 3);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(sizeArr, 1));
      g.setAttribute('aPhase', new THREE.BufferAttribute(phaseArr, 1));
      g.setAttribute('aColor', new THREE.BufferAttribute(colArr, 3));
      const nodes = new THREE.Points(
        g,
        track(
          new THREE.ShaderMaterial({
            vertexShader: pointsVert,
            fragmentShader: pointsFrag,
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr }, uAtten: { value: 1 } },
            ...additive,
          })
        )
      );
      // connections: k nearest neighbours
      const k = 3;
      const lp = [];
      const lPhase = [];
      const lT = [];
      const seen = new Set();
      for (let i = 0; i < pts.length; i++) {
        const d = [];
        for (let j = 0; j < pts.length; j++) if (j !== i) d.push([pts[i].distanceToSquared(pts[j]), j]);
        d.sort((a, b) => a[0] - b[0]);
        for (let n = 0; n < k; n++) {
          const j = d[n][1];
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const ph = Math.random();
          lp.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
          lPhase.push(ph, ph);
          lT.push(0, 1);
        }
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      lg.setAttribute('aPhase', new THREE.Float32BufferAttribute(lPhase, 1));
      lg.setAttribute('aT', new THREE.Float32BufferAttribute(lT, 1));
      const lines = new THREE.LineSegments(
        lg,
        track(
          new THREE.ShaderMaterial({
            vertexShader: neuralLineVert,
            fragmentShader: neuralLineFrag,
            uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(accent) } },
            ...additive,
          })
        )
      );
      const net = new THREE.Group();
      net.add(nodes, lines);
      group.add(net);
      animators.push((t, dt) => {
        net.rotation.y += dt * 0.07;
        net.rotation.x = Math.sin(t * 0.1) * 0.2;
        const s = 1 + Math.sin(t * 1.4) * 0.015;
        net.scale.setScalar(s);
      });
    }

    if (p.id === 'ciberseguridad') {
      const shield = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.55, Q.segs, Q.segs / 2),
        track(
          new THREE.ShaderMaterial({
            vertexShader: shieldVert,
            fragmentShader: shieldFrag,
            uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(accent) } },
            side: THREE.DoubleSide,
            ...additive,
          })
        )
      );
      group.add(shield);
      const scanRing = new THREE.Mesh(
        new THREE.TorusGeometry(r * 1.62, 0.012, 6, 128),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, ...additive })
      );
      scanRing.rotation.x = Math.PI / 2;
      group.add(scanRing);
      animators.push((t, dt) => {
        shield.rotation.y += dt * 0.05;
        const y = Math.sin(t * 0.6) * 0.95;
        scanRing.position.y = y * r * 1.55;
        scanRing.scale.setScalar(Math.sqrt(Math.max(0.02, 1 - y * y)));
      });
    }

    if (p.id === 'laboratorios') {
      const chain = new THREE.Group();
      chain.rotation.set(0.5, 0, 0.3);
      const n = mobile ? 9 : 12;
      const rr = r * 2.5;
      const boxGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
      const boxMat = makeBoxMaterial(accent);
      const blocks = [];
      const linkPts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const b = new THREE.Mesh(boxGeo, boxMat);
        b.position.set(Math.cos(a) * rr, Math.sin(a * 3) * 0.25, Math.sin(a) * rr);
        b.rotation.set(Math.random() * 3, Math.random() * 3, 0);
        chain.add(b);
        blocks.push(b);
      }
      for (let i = 0; i < n; i++) {
        const a = blocks[i].position;
        const b = blocks[(i + 1) % n].position;
        linkPts.push(a.clone(), b.clone());
      }
      const links = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(linkPts),
        new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55, ...additive })
      );
      chain.add(links);
      group.add(chain);
      animators.push((t, dt) => {
        chain.rotation.y += dt * 0.1;
        blocks.forEach((b, i) => {
          b.rotation.x += dt * (0.3 + i * 0.02);
          b.rotation.y += dt * 0.4;
        });
      });
    }
  }

  function orbitLineLocal(radius, color, opacity) {
    const l = orbitLine(radius, color, 128);
    l.material.opacity = opacity;
    return l;
  }

  /* ---------------------------------------------------------------------- */
  /* Camera stations                                                         */
  /* ---------------------------------------------------------------------- */

  const stations = [];
  function buildStations() {
    stations.length = 0;
    const portrait = window.innerWidth / window.innerHeight < 0.9;
    const m = portrait ? 1.75 : 1;
    const sx = portrait ? 0 : 0.36;
    const sy = portrait ? 0.5 : 0;
    // 0 · core (sun)
    stations.push({
      pos: new THREE.Vector3(Math.cos(3.3) * 17 * m, 7 * m, Math.sin(3.3) * 17 * m),
      target: new THREE.Vector3(0, 0, 0),
      shift: [portrait ? 0 : 0.42, portrait ? 0.4 : 0],
      label: '00 · Núcleo',
    });
    const up = new THREE.Vector3(0, 1, 0);
    planets.forEach((p, i) => {
      const P = p.group.position;
      const radial = P.clone().normalize();
      const tangent = new THREE.Vector3().crossVectors(up, radial).normalize();
      const d = p.def.r * (p.def.dist ?? 6.2) * m;
      const dir = radial.clone().multiplyScalar(-0.42).add(tangent.multiplyScalar(0.9)).normalize();
      const pos = P.clone().add(dir.multiplyScalar(d)).add(new THREE.Vector3(0, d * 0.26, 0));
      stations.push({ pos, target: P.clone(), shift: [sx, sy], label: `0${i + 1} · ${p.label}` });
    });
    // 6 · overview
    stations.push({
      pos: new THREE.Vector3(portrait ? 4 : 10, portrait ? 112 : 58, portrait ? 30 : 52),
      target: new THREE.Vector3(0, 0, 0),
      shift: [portrait ? 0 : 0.5, portrait ? 0.1 : 0],
      label: '06 · Vista orbital',
    });
    // 7 · contact: look back at the sun from deep space
    stations.push({
      pos: new THREE.Vector3(-30, 7, 44).multiplyScalar(portrait ? 1.25 : 1),
      target: new THREE.Vector3(0, 0, 0),
      shift: [portrait ? 0 : 0.3, portrait ? 0.32 : 0],
      label: '07 · Señal de salida',
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Scroll → station progress                                               */
  /* ---------------------------------------------------------------------- */

  let centers = [];
  function measure() {
    const y = window.scrollY;
    centers = sections.map((s) => {
      const r = s.el.getBoundingClientRect();
      return r.top + y + r.height / 2;
    });
  }

  function scrollStation() {
    const vc = window.scrollY + window.innerHeight / 2;
    if (vc <= centers[0]) return 0;
    for (let i = 0; i < centers.length - 1; i++) {
      if (vc <= centers[i + 1]) {
        const f = (vc - centers[i]) / (centers[i + 1] - centers[i]);
        return i + smooth(0.12, 0.88, f); // dwell at each station
      }
    }
    return centers.length - 1;
  }

  /* ---------------------------------------------------------------------- */
  /* Pointer + picking                                                       */
  /* ---------------------------------------------------------------------- */

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, clientX: 0, clientY: 0, active: false };
  let hovered = null;

  const overUi = (target) =>
    target instanceof Element && !!target.closest('.panel, a, button, summary, .menu-panel, .topbar, .rail, .footer');

  function onPointerMove(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.clientX = e.clientX;
    pointer.clientY = e.clientY;
    pointer.active = e.pointerType === 'mouse' && !overUi(e.target);
  }

  function onClick(e) {
    if (overUi(e.target)) return;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    const hit = pick();
    if (hit) goTo(hit.userData.id);
  }

  function goTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }

  const sunHit = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.3, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  sunHit.userData = { id: 'inicio', title: 'Núcleo · David Fuentes' };
  scene.add(sunHit);
  hitTargets.push(sunHit);

  function pick() {
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    return hits.length ? hits[0].object : null;
  }

  /* ---------------------------------------------------------------------- */
  /* Loop                                                                    */
  /* ---------------------------------------------------------------------- */

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const right = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  let shiftX = 0;
  let shiftY = 0;
  let progress = 0;
  let running = false;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  let intro = 0;
  let frameAcc = 0;
  let frameCount = 0;
  let lastLabel = '';

  function sample(s, outPos, outTarget) {
    const i = Math.min(Math.floor(s), stations.length - 2);
    const f = clamp01(s - i);
    const a = stations[i];
    const b = stations[i + 1];
    outPos.lerpVectors(a.pos, b.pos, f);
    // arc: lift the camera mid-flight so transitions feel like a flyby
    const lift = a.pos.distanceTo(b.pos) * 0.22 * Math.sin(Math.PI * f);
    outPos.y += lift;
    // never cut through the sun
    const rxz = Math.hypot(outPos.x, outPos.z);
    if (rxz < 9 && outPos.y < 9) {
      const k = 9 / Math.max(rxz, 0.001);
      outPos.x *= k;
      outPos.z *= k;
    }
    outTarget.lerpVectors(a.target, b.target, f);
    return [a.shift[0] + (b.shift[0] - a.shift[0]) * f, a.shift[1] + (b.shift[1] - a.shift[1]) * f, f < 0.5 ? a.label : b.label];
  }

  function applyShift(sx, sy) {
    const e = camera.projectionMatrix.elements;
    e[8] = -sx;
    e[9] = -sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const rawDt = Math.min((now - last) / 1000, 0.25);
    const dt = Math.min(rawDt, 0.05);
    last = now;
    elapsed += dt;
    intro = Math.min(1, intro + rawDt / 2.6);

    // adaptive resolution: drop pixel ratio if we are consistently slow
    frameAcc += dt;
    frameCount++;
    if (frameCount >= 90) {
      const avg = frameAcc / frameCount;
      if (avg > 1 / 40 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
      }
      frameAcc = 0;
      frameCount = 0;
    }

    progress = damp(progress, scrollStation(), 3.2, rawDt);
    const [sx, sy, label] = sample(progress, tmpA, tmpB);
    camPos.copy(tmpA);
    camTarget.copy(tmpB);

    // intro dolly
    const ie = 1 - Math.pow(1 - intro, 3);
    camPos.lerp(tmpA.set(camPos.x * 2.4, camPos.y + 18, camPos.z * 2.4), 1 - ie);

    // pointer parallax (desktop)
    pointer.sx = damp(pointer.sx, mobile ? 0 : pointer.x, 2.5, dt);
    pointer.sy = damp(pointer.sy, mobile ? 0 : pointer.y, 2.5, dt);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    right.setFromMatrixColumn(camera.matrix, 0);
    camUp.setFromMatrixColumn(camera.matrix, 1);
    const par = camPos.distanceTo(camTarget) * 0.025;
    camera.position.addScaledVector(right, pointer.sx * par).addScaledVector(camUp, pointer.sy * par);
    camera.lookAt(camTarget);

    shiftX = sx;
    shiftY = sy;
    applyShift(shiftX, shiftY);

    // world animation
    for (const u of timeUniforms) u.value = elapsed;
    corona.quaternion.copy(camera.quaternion);
    sun.rotation.y += dt * 0.03;
    dust.rotation.y += dt * 0.006;
    stars.rotation.y += dt * 0.002;
    const active = Math.round(progress) - 1;
    planets.forEach((p, i) => {
      p.spin.rotation.y += dt * (0.12 + i * 0.02);
      p.focus = damp(p.focus, i === active ? 1 : 0, 3, dt);
      p.mat.uniforms.uFocus.value = p.focus;
      p.orbit.material.opacity = 0.1 + p.focus * 0.4 + (progress > 5.5 ? 0.18 : 0);
    });
    for (const a of animators) a(elapsed, dt);

    // hover picking (mouse only)
    if (pointer.active) {
      ndc.set(pointer.x, pointer.y);
      const h = pick();
      if (h !== hovered) {
        hovered = h;
        document.body.style.cursor = h ? 'pointer' : '';
        if (tooltip) {
          if (h) tooltip.innerHTML = `${h.userData.title}<small>Clic para viajar</small>`;
          tooltip.classList.toggle('is-visible', !!h);
        }
      }
      if (h && tooltip) tooltip.style.transform = `translate3d(${pointer.clientX + 16}px, ${pointer.clientY + 16}px, 0)`;
    } else if (hovered) {
      hovered = null;
      document.body.style.cursor = '';
      tooltip?.classList.remove('is-visible');
    }

    if (hud) {
      if (label !== lastLabel) {
        hud.station.textContent = label;
        lastLabel = label;
      }
      hud.coords.textContent = `x ${camera.position.x.toFixed(1)} · y ${camera.position.y.toFixed(1)} · z ${camera.position.z.toFixed(1)}`;
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.fov = w < 760 ? 52 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    buildStations();
    measure();
  }

  let resizeRaf = 0;
  const onResizeThrottled = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(onResize);
  };

  const onVisibility = () => {
    if (document.hidden) pause();
    else if (wantRunning) resume();
  };

  let wantRunning = false;
  function resume() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Pause when the canvas is not on screen (e.g. hidden by the static mode)
  const io = new IntersectionObserver((entries) => {
    const visible = entries[0]?.isIntersecting;
    if (!visible) pause();
    else if (wantRunning && !document.hidden) resume();
  });
  io.observe(renderer.domElement);

  // Section heights change with fonts, viewport and mode: keep centers fresh.
  const ro = new ResizeObserver(() => measure());
  ro.observe(sections[0].el.parentElement);

  onResize();
  progress = scrollStation();

  // compile shaders up-front so the first frames don't stutter
  renderer.compile(scene, camera);

  return {
    start() {
      wantRunning = true;
      measure();
      window.addEventListener('resize', onResizeThrottled);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('click', onClick);
      document.addEventListener('visibilitychange', onVisibility);
      if (!document.hidden) resume();
    },
    stop() {
      wantRunning = false;
      pause();
      window.removeEventListener('resize', onResizeThrottled);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      document.body.style.cursor = '';
      tooltip?.classList.remove('is-visible');
      hovered = null;
    },
    remeasure: measure,
  };
}

/**
 * Campo de flujo generativo en WebGL puro (sin librerías).
 *
 * - fbm con «domain warping» que deriva lentamente y reacciona al puntero
 *   (remolino suave) y al scroll (zoom/deriva y atenuación).
 * - DPR limitado y escala de resolución adaptativa según el coste por frame.
 * - Pausa cuando el escenario sale del viewport o la pestaña se oculta.
 * - Sin WebGL o con prefers-reduced-motion: no se inicializa y queda el
 *   fondo estático en CSS.
 */

const VERT_300 = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const VERT_100 = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG_BODY = `
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerAmt;
uniform float uScroll;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// ruido de gradiente 2D
vec2 grad(vec2 i) {
  float a = hash(i) * 6.2831853;
  return vec2(cos(a), sin(a));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad(i), f);
  float b = dot(grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = ROT * p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  float m = min(uRes.x, uRes.y);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / m;
  vec2 mp = (uPointer * uRes - 0.5 * uRes) / m;

  // scroll: zoom suave y deriva vertical
  float s = uScroll;
  p *= 1.05 + 0.3 * s;
  mp *= 1.05 + 0.3 * s;
  p.y -= s * 0.55;
  mp.y -= s * 0.55;

  // remolino alrededor del puntero
  float d = length(p - mp);
  float swirl = uPointerAmt * 0.9 * exp(-d * d * 3.2);
  p = rot(swirl) * (p - mp) + mp;

  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p + 2.8 * q + vec2(1.7, 9.2) + 0.7 * t),
    fbm(p + 2.8 * q + vec2(8.3, 2.8) - 0.5 * t)
  );
  float f = fbm(p + 2.6 * r);

  // paleta sobria: tinta azulada, pizarra, verde petróleo y hueso
  vec3 ink    = vec3(0.018, 0.022, 0.032);
  vec3 slate  = vec3(0.085, 0.120, 0.155);
  vec3 petrol = vec3(0.060, 0.230, 0.245);
  vec3 bone   = vec3(0.440, 0.410, 0.360);

  float fn = clamp(f * 2.0 + 0.5, 0.0, 1.0);
  vec3 col = mix(ink, slate, smoothstep(0.1, 0.9, fn));
  col = mix(col, petrol, smoothstep(0.2, 0.8, length(q) * 1.6) * 0.85);
  col = mix(col, bone, pow(clamp(r.x * 1.7 + 0.5, 0.0, 1.0), 3.0) * 0.55);
  col *= 0.75 + 0.5 * smoothstep(0.2, 0.9, fn);

  // isolíneas tipo topografía
  float iso = f * 11.0;
  float w = FWIDTH(iso) * 1.1 + 0.0001;
  float dd = abs(fract(iso - 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.0, w, dd);
  float near = exp(-d * d * 2.2);
  vec3 lineCol = mix(vec3(0.20, 0.24, 0.26), vec3(0.38, 0.30, 0.22), near * uPointerAmt);
  col = mix(col, lineCol, line * (0.16 + 0.5 * near * uPointerAmt));

  // luz cercana al puntero
  col += vec3(0.05, 0.06, 0.06) * near * uPointerAmt;

  // viñeta y atenuación con el scroll (más legibilidad al bajar)
  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(uRes.x / m, uRes.y / m) * 0.9));
  col *= mix(0.55, 1.0, vig);
  col *= mix(1.0, 0.62, clamp(s * 0.8, 0.0, 1.0));

  // grano
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.018;

  // techo de luminancia: el texto claro mantiene contraste AA sobre cualquier zona
  col = clamp(col, 0.0, 0.36);
  OUT_COLOR = vec4(col, 1.0);
}`;

const FRAG_300 = `#version 300 es
precision highp float;
out vec4 fragColor;
#define OUT_COLOR fragColor
#define FWIDTH fwidth
${FRAG_BODY}`;

const fragFor100 = (derivatives: boolean) => `${derivatives ? '#extension GL_OES_standard_derivatives : enable\n' : ''}
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define OUT_COLOR gl_FragColor
${derivatives ? '#define FWIDTH fwidth' : '#define FWIDTH(x) (0.03)'}
${FRAG_BODY}`;

type GL = WebGLRenderingContext | WebGL2RenderingContext;

function compile(gl: GL, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function link(gl: GL, vs: string, fs: string) {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  return prog;
}

export function initField() {
  const root = document.documentElement;
  const canvas = document.querySelector<HTMLCanvasElement>('[data-field]');
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-field-toggle]');
  const hud = document.querySelector<HTMLElement>('[data-hud]');
  if (!canvas || !stage) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) {
    root.dataset.gl = 'static';
    return;
  }

  const opts: WebGLContextAttributes = {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  };

  let gl: GL | null = canvas.getContext('webgl2', opts) as WebGL2RenderingContext | null;
  let prog: WebGLProgram | null = null;
  if (gl) prog = link(gl, VERT_300, FRAG_300);
  if (!prog) {
    gl = (canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
    if (gl) {
      const deriv = !!gl.getExtension('OES_standard_derivatives');
      prog = link(gl, VERT_100, fragFor100(deriv));
    }
  }
  if (!gl || !prog) {
    root.dataset.gl = 'off';
    return;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(prog);

  const u = {
    res: gl.getUniformLocation(prog, 'uRes'),
    time: gl.getUniformLocation(prog, 'uTime'),
    pointer: gl.getUniformLocation(prog, 'uPointer'),
    pointerAmt: gl.getUniformLocation(prog, 'uPointerAmt'),
    scroll: gl.getUniformLocation(prog, 'uScroll'),
  };

  // --- tamaño: DPR limitado + escala adaptativa ---
  const MAX_DPR = 1.5;
  let quality = window.matchMedia('(pointer: coarse)').matches ? 0.75 : 1;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * quality;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
    }
  };

  // --- entrada: puntero y scroll suavizados ---
  const target = { x: 0.62, y: 0.58, amt: 0, scroll: 0 };
  const cur = { x: 0.62, y: 0.58, amt: 0, scroll: 0 };
  let lastMove = 0;

  window.addEventListener(
    'pointermove',
    (e) => {
      const rect = canvas.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width;
      target.y = 1 - (e.clientY - rect.top) / rect.height;
      target.amt = 1;
      lastMove = performance.now();
      wake();
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => (target.amt = 0));

  const readScroll = () => {
    target.scroll = Math.min(2, window.scrollY / Math.max(1, window.innerHeight));
  };
  window.addEventListener(
    'scroll',
    () => {
      readScroll();
      wake();
    },
    { passive: true },
  );
  readScroll();

  // --- bucle con pausa ---
  let raf = 0;
  let running = false;
  let inView = true;
  let userPaused = false;
  let t = 0;
  let last = 0;
  let frames = 0;
  let costAcc = 0;
  let firstFrame = true;

  const fmt = (n: number) => n.toFixed(2).padStart(5, ' ');

  const frame = (now: number) => {
    raf = 0;
    if (!shouldRun()) {
      running = false;
      return;
    }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    t += dt;

    // el remolino se desvanece si el puntero deja de moverse
    if (now - lastMove > 2200) target.amt = 0;
    const k = 1 - Math.pow(0.001, dt);
    cur.x += (target.x - cur.x) * k * 0.9;
    cur.y += (target.y - cur.y) * k * 0.9;
    cur.amt += (target.amt - cur.amt) * k * 0.6;
    cur.scroll += (target.scroll - cur.scroll) * k;

    resize();
    gl!.uniform2f(u.res, canvas.width, canvas.height);
    gl!.uniform1f(u.time, t + 40);
    gl!.uniform2f(u.pointer, cur.x, cur.y);
    gl!.uniform1f(u.pointerAmt, cur.amt);
    gl!.uniform1f(u.scroll, cur.scroll);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);

    if (firstFrame) {
      firstFrame = false;
      root.dataset.gl = 'on';
    }

    // escala adaptativa: si el frame es caro, baja la resolución interna
    costAcc += dt;
    frames++;
    if (frames === 45) {
      const avg = costAcc / frames;
      if (avg > 0.024 && quality > 0.5) quality = Math.max(0.5, quality - 0.15);
      else if (avg < 0.0175 && quality < 1) quality = Math.min(1, quality + 0.1);
      frames = 0;
      costAcc = 0;
    }

    if (hud) {
      hud.textContent = `x ${fmt(cur.x)} · y ${fmt(cur.y)} · scroll ${fmt(cur.scroll)}`;
    }

    raf = requestAnimationFrame(frame);
  };

  const shouldRun = () => inView && !document.hidden && !userPaused;

  function wake() {
    if (!running && shouldRun()) {
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  const sleep = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    running = false;
  };

  new IntersectionObserver(
    (entries) => {
      inView = entries.some((e) => e.isIntersecting);
      inView ? wake() : sleep();
    },
    { rootMargin: '0px' },
  ).observe(stage);

  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.querySelector('[data-label]')!.textContent = userPaused ? 'Reanudar fondo' : 'Pausar fondo';
      userPaused ? sleep() : wake();
    });
  }

  // si el usuario activa reducir movimiento en caliente, volvemos al fondo estático
  reduced.addEventListener('change', (e) => {
    if (e.matches) {
      userPaused = true;
      sleep();
      root.dataset.gl = 'static';
      if (toggle) toggle.hidden = true;
    }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    sleep();
    root.dataset.gl = 'off';
  });

  window.addEventListener('resize', () => wake(), { passive: true });
  wake();
}

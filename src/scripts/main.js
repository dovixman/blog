import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const pad = (n) => String(n).padStart(2, '0');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

if (!reduced) html.classList.add('motion');

/* ------------------------------------------------------------------ */
/* Text splitting                                                      */
/* ------------------------------------------------------------------ */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  return [...text].map((ch) => {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(s);
    return s;
  });
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  return words.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return s;
  });
}

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.9,
    anchors: { offset: 0 },
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------------ */
/* Scene choreography                                                  */
/* ------------------------------------------------------------------ */
const sections = [...document.querySelectorAll('[data-scene]')];
const LAYOUT = {
  desktop: {
    monolith: { morph: 0, x: 5.2, y: 0.4, scale: 1, tilt: 0.42, spin: 0, dim: 1, activeAmt: 0 },
    distributed: { morph: 1, x: 6.4, y: 0, scale: 0.9, tilt: 0.26, spin: 0.9, dim: 0.9, activeAmt: 0 },
    network: { morph: 1, x: 2, y: 0, scale: 1.3, tilt: 0.62, spin: 2.1, dim: 0.24, activeAmt: 0 },
    layers: { morph: 2, x: -7.2, y: -2.6, scale: 0.78, tilt: 0.2, spin: 3.0, dim: 0.7, activeAmt: 1 },
    offline: { morph: 2, x: -7.2, y: -2.6, scale: 0.78, tilt: 0.2, spin: 3.2, dim: 0.7, activeAmt: 1 },
    recomposed: { morph: 3, x: 7.2, y: 1.2, scale: 1.05, tilt: 0.62, spin: 4.6, dim: 0.85, activeAmt: 0 },
  },
  mobile: {
    monolith: { morph: 0, x: 0, y: 4.2, scale: 0.92, tilt: 0.42, spin: 0, dim: 1, activeAmt: 0 },
    distributed: { morph: 1, x: 0, y: 1, scale: 0.9, tilt: 0.3, spin: 0.9, dim: 0.42, activeAmt: 0 },
    network: { morph: 1, x: 0, y: 0, scale: 1.1, tilt: 0.6, spin: 2.1, dim: 0.3, activeAmt: 0 },
    layers: { morph: 2, x: 0, y: 2, scale: 0.85, tilt: 0.24, spin: 3, dim: 0.4, activeAmt: 1 },
    offline: { morph: 2, x: 0, y: 2, scale: 0.85, tilt: 0.24, spin: 3.2, dim: 0.4, activeAmt: 1 },
    recomposed: { morph: 3, x: 0, y: 3.6, scale: 0.9, tilt: 0.62, spin: 4.6, dim: 0.5, activeAmt: 0 },
  },
};
const layout = LAYOUT[mobile ? 'mobile' : 'desktop'];
const stateOf = (sec) => layout[sec.dataset.label] || layout.monolith;

let scene = null;
let activeLayer = 6;
const hud = {
  sec: document.querySelector('[data-hud-sec]'),
  state: document.querySelector('[data-hud-state]'),
  progress: document.querySelector('[data-hud-progress]'),
  gl: document.querySelector('[data-hud-gl]'),
};
const edu = document.querySelector('.edu__inner');

function choreograph() {
  const vh = window.innerHeight;
  const mid = vh * 0.5;
  let idx = 0;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].getBoundingClientRect().top <= mid) idx = i;
  }
  const cur = sections[idx];
  const next = sections[Math.min(idx + 1, sections.length - 1)];
  const r = cur.getBoundingClientRect();
  const t = clamp01((mid - r.top) / Math.max(1, r.height));
  const w = next === cur ? 0 : smooth(0.55, 1, t);
  const a = stateOf(cur);
  const b = stateOf(next);
  const blended = {};
  for (const k of Object.keys(a)) blended[k] = a[k] + (b[k] - a[k]) * w;
  blended.active = activeLayer;

  if (hud.sec) hud.sec.textContent = `${pad(idx)} / ${pad(sections.length - 1)}`;
  if (hud.state) hud.state.textContent = cur.dataset.label;
  if (hud.progress) {
    const max = document.documentElement.scrollHeight - vh;
    hud.progress.style.transform = `scaleX(${max > 0 ? clamp01(window.scrollY / max) : 0})`;
  }

  if (!scene) return;
  scene.set(blended);

  // the light section fully covers the stage: stop rendering
  const er = edu.getBoundingClientRect();
  const covered = er.top <= 0 && er.bottom >= vh;
  if (covered) scene.stop();
  else if (!reduced) scene.start();
}

// topbar steps aside while reading downwards, returns on scroll up
const topbar = document.querySelector('.topbar');
let lastY = window.scrollY;
function topbarState() {
  const y = window.scrollY;
  const down = y > lastY + 2;
  const up = y < lastY - 2;
  if (y < window.innerHeight * 0.6 || up) topbar.classList.remove('is-hidden');
  else if (down && !topbar.contains(document.activeElement)) topbar.classList.add('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', topbarState, { passive: true });
topbar.addEventListener('focusin', () => topbar.classList.remove('is-hidden'));

if (lenis) lenis.on('scroll', choreograph);
else {
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        choreograph();
      });
    },
    { passive: true }
  );
}
window.addEventListener('resize', choreograph, { passive: true });
choreograph();

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function bootScene() {
  if (!hasWebGL()) {
    if (hud.gl) hud.gl.textContent = 'n/a';
    return;
  }
  try {
    const { createScene } = await import('./scene.js');
    const canvas = document.getElementById('scene');
    scene = createScene(canvas, { mobile, reduced });
    scene.onFps((fps) => {
      if (hud.gl) hud.gl.textContent = fps ? `${fps} fps` : 'paused';
    });
    choreograph();
    scene.snap();
    canvas.classList.add('is-ready');
    html.classList.add('has-gl');
    if (reduced && hud.gl) hud.gl.textContent = 'static';
  } catch (err) {
    console.warn('[scene] disabled:', err);
  }
}

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
if (document.readyState === 'complete') idle(bootScene);
else window.addEventListener('load', () => idle(bootScene), { once: true });

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */
const heroChars = [...document.querySelectorAll('[data-split]')].flatMap(splitChars);
const manifestoWords = [...document.querySelectorAll('[data-words]')].flatMap(splitWords);

// career tracking (works with or without motion)
const career = document.querySelector('.career');
const jobs = [...document.querySelectorAll('[data-job]')];
const layerNum = document.querySelector('[data-layer-num]');
function setActiveJob(job) {
  jobs.forEach((j) => j.classList.toggle('is-active', j === job));
  activeLayer = Number(job.dataset.job);
  if (layerNum) layerNum.textContent = pad(activeLayer + 1);
  choreograph();
}
ScrollTrigger.create({
  trigger: career,
  start: 'top 60%',
  end: 'bottom 40%',
  toggleClass: { targets: career, className: 'is-tracking' },
});
jobs.forEach((job) => {
  ScrollTrigger.create({
    trigger: job,
    start: 'top 58%',
    end: 'bottom 58%',
    onToggle: (self) => self.isActive && setActiveJob(job),
  });
});

if (reduced) {
  html.classList.add('is-loaded');
} else {
  runIntro();
  scrollMotion();
  typeDeformation();
  magnetic();
}

function runIntro() {
  const curtain = document.querySelector('.curtain');
  curtain.style.animation = 'none';
  curtain.innerHTML =
    '<div class="curtain__inner"><span class="mono">Compilando sistema</span><span class="mono curtain__count">000</span></div><span class="curtain__bar"></span>';
  const count = curtain.querySelector('.curtain__count');
  const bar = curtain.querySelector('.curtain__bar');
  const counter = { v: 0 };

  const tl = gsap.timeline({
    defaults: { ease: 'expo.out' },
    onComplete: () => html.classList.add('is-loaded'),
  });
  gsap.set(heroChars, { yPercent: 115 });
  gsap.set('.hero__meta > *, .hero__foot > *', { y: 24, opacity: 0 });

  tl.to(counter, {
    v: 100,
    duration: 0.9,
    ease: 'power2.inOut',
    onUpdate: () => {
      count.textContent = String(Math.round(counter.v)).padStart(3, '0');
    },
  })
    .to(bar, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 0)
    .to(curtain, { yPercent: -100, duration: 1.05, ease: 'expo.inOut' }, '+=0.05')
    .to(heroChars, { yPercent: 0, duration: 1.4, stagger: 0.035 }, '-=0.55')
    .to('.hero__meta > *, .hero__foot > *', { y: 0, opacity: 1, duration: 1.1, stagger: 0.08 }, '-=1.1');
}

function scrollMotion() {
  // hero exit: letters drift apart at different speeds
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  heroChars.forEach((c, i) => {
    heroTl.to(c, { yPercent: -(40 + ((i * 37) % 90)), ease: 'none' }, 0);
  });
  heroTl
    .to('.hero__title', { opacity: 0.08, ease: 'none' }, 0)
    .to('.hero__foot, .hero__meta', { y: -80, opacity: 0, ease: 'none' }, 0);

  // section rules draw in
  gsap.utils.toArray('.sec-head').forEach((head) => {
    const rule = head.querySelector('.sec-head__rule');
    gsap.fromTo(
      rule,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: head, start: 'top 88%' } }
    );
    gsap.from(head.querySelectorAll('.mono'), {
      y: 16,
      opacity: 0,
      duration: 1,
      stagger: 0.08,
      ease: 'expo.out',
      scrollTrigger: { trigger: head, start: 'top 88%' },
    });
  });

  // manifesto: words light up as you read
  if (manifestoWords.length) {
    gsap.fromTo(
      manifestoWords,
      { opacity: 0.2 },
      {
        opacity: 1,
        stagger: 0.12,
        ease: 'none',
        scrollTrigger: { trigger: '.manifesto__text', start: 'top 82%', end: 'bottom 42%', scrub: true },
      }
    );
  }

  // generic reveals
  ScrollTrigger.batch('[data-reveal]:not(.hero__lede)', {
    start: 'top 90%',
    once: true,
    onEnter: (els) =>
      gsap.fromTo(
        els,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.09, ease: 'expo.out', overwrite: true }
      ),
  });
  gsap.set('.hero__lede', { opacity: 1 });

  // marquee: scroll-driven
  gsap.fromTo(
    '[data-marquee]',
    { xPercent: 0 },
    {
      xPercent: -38,
      ease: 'none',
      scrollTrigger: { trigger: '.areas', start: 'top bottom', end: 'bottom top', scrub: true },
    }
  );

  // light section opens like an aperture
  gsap.fromTo(
    '.edu',
    { '--clip': mobile ? '4%' : '9%' },
    {
      '--clip': '0%',
      ease: 'none',
      scrollTrigger: { trigger: '.edu', start: 'top bottom', end: 'top 10%', scrub: true },
    }
  );
  gsap.from('.edu__statement', {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: { trigger: '.edu', start: 'top bottom', end: 'top top', scrub: true },
  });

  // career big number counts with a little vertical slot motion
  gsap.from('.career__big', {
    yPercent: 40,
    opacity: 0,
    duration: 1.4,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.career', start: 'top 75%' },
  });
  gsap.from('.job', {
    y: 40,
    opacity: 0,
    duration: 1.1,
    stagger: 0.06,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.career__list', start: 'top 85%' },
    clearProps: 'opacity',
  });

  // contact headline rises line by line
  gsap.from('.contact__line > span', {
    yPercent: 110,
    duration: 1.3,
    stagger: 0.09,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.contact__title', start: 'top 80%' },
  });
  gsap.from('.contact__mail', {
    y: 40,
    opacity: 0,
    duration: 1.2,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.contact__mail', start: 'top 92%' },
  });

  // scroll velocity bends the big type (skew + vertical stretch)
  const bendables = gsap.utils.toArray('.manifesto__text, .contact__title, .career__big, .edu__statement');
  const skewers = bendables.map((el) => gsap.quickTo(el, 'skewY', { duration: 0.6, ease: 'power3.out' }));
  const marquee = document.querySelector('[data-marquee]');
  const marqueeSkew = marquee ? gsap.quickTo(marquee, 'skewX', { duration: 0.6, ease: 'power3.out' }) : null;
  if (lenis) {
    lenis.on('scroll', ({ velocity }) => {
      const v = gsap.utils.clamp(-5, 5, velocity * 0.18);
      skewers.forEach((fn) => fn(v * 0.6));
      marqueeSkew && marqueeSkew(-v * 2);
    });
  }
}

/* Variable-weight typography that reacts to the pointer */
function typeDeformation() {
  if (mobile || !heroChars.length) return;
  const state = heroChars.map(() => ({ cur: 800, target: 800 }));
  let px = -9999;
  let py = -9999;
  window.addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX;
      py = e.clientY;
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => {
    px = py = -9999;
  });
  const radius = () => Math.max(220, window.innerWidth * 0.2);
  gsap.ticker.add(() => {
    if (window.scrollY > window.innerHeight) return;
    const R = radius();
    heroChars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const f = 1 - smooth(0, R, d);
      const s = state[i];
      s.target = 800 - 640 * f;
      s.cur += (s.target - s.cur) * 0.12;
      c.style.setProperty('--w', s.cur.toFixed(1));
    });
  });
}

function magnetic() {
  if (mobile) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const arrow = el.querySelector('.contact__mail-arrow');
    if (!arrow) return;
    const xTo = gsap.quickTo(arrow, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(arrow, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = arrow.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.25);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

window.addEventListener('load', () => ScrollTrigger.refresh());

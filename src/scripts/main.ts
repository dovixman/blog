import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { createTopology, type Topology } from './topology';
import { createScope } from './scope';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, MotionPathPlugin);

const root = document.documentElement;
root.classList.add('motion-ready');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, p: ParentNode = document) => p.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, p: ParentNode = document) => Array.from(p.querySelectorAll<T>(s));
const GLYPHS = '01<>/\\[]{}#+=_-';

/* ------------------------------------------------------------------ chrome */

function initClock() {
  const el = $('[data-clock]');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    el.textContent = `UTC ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
  };
  tick();
  setInterval(tick, 1000);
}

function initHeader() {
  const onScroll = () => root.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const links = $$<HTMLAnchorElement>('[data-nav]');
  const sections = links.map((l) => document.getElementById(l.dataset.nav!)).filter(Boolean) as HTMLElement[];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((l) =>
          l.dataset.nav === e.target.id ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current'),
        );
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => io.observe(s));

  if (!reduced) {
    $$('[data-scramble]').forEach((el) => {
      const text = el.textContent ?? '';
      el.closest('a')?.addEventListener('mouseenter', () => {
        gsap.to(el, { duration: 0.5, scrambleText: { text, chars: GLYPHS, speed: 0.6 }, overwrite: true });
      });
    });
  }
}

/* -------------------------------------------------------------------- hero */

let topology: Topology | null = null;

function initTopology() {
  const canvas = $<HTMLCanvasElement>('[data-topology]');
  if (!canvas) return;
  const px = $('[data-px]');
  const py = $('[data-py]');
  const pn = $('[data-pn]');
  topology = createTopology(canvas, {
    reduced,
    onHover(label, x, y) {
      if (px) px.textContent = String(Math.max(0, Math.round(x))).padStart(4, '0');
      if (py) py.textContent = String(Math.max(0, Math.round(y))).padStart(4, '0');
      if (pn) pn.textContent = label ?? '—';
    },
  });
}

function heroIntro() {
  root.classList.remove('intro-pending');
  if (reduced) return;
  const title = $('[data-hero-title]');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const state = { v: 0 };
  tl.to(state, { v: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: () => topology?.setReveal(state.v) }, 0);
  if (title) {
    // Word masks keep the CSS-driven line flow intact on every breakpoint.
    const split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'split-word' });
    tl.from(split.words, { yPercent: 110, duration: 1.3, stagger: 0.045 }, 0.1);
  }
  tl.from('[data-hero-in]', { y: 18, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.45);
  tl.from('.telemetry .tm', { y: 12, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.7);
  $$('[data-count]').forEach((el, i) => {
    const target = el.dataset.count!;
    const n = parseInt(target, 10);
    const pad = target.length;
    const o = { v: n > 1000 ? n - 14 : 0 };
    tl.to(
      o,
      {
        v: n,
        duration: 1.4,
        ease: 'power3.out',
        onUpdate: () => (el.textContent = String(Math.round(o.v)).padStart(pad, '0')),
      },
      0.75 + i * 0.06,
    );
  });
}

function runBoot(): Promise<void> {
  const screen = $('#boot');
  if (!root.classList.contains('is-booting') || !screen || reduced) {
    root.classList.remove('is-booting');
    return Promise.resolve();
  }
  root.classList.add('boot-running');
  document.body.style.overflow = 'hidden';

  return new Promise((resolve) => {
    const lines = $$('[data-boot-line]', screen);
    const bar = $('[data-boot-bar]', screen);
    const pct = $('[data-boot-pct]', screen);
    const prog = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    gsap.set(screen, { clipPath: 'inset(0% 0% 0% 0%)' });

    tl.to(prog, {
      v: 100,
      duration: 1.9,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (pct) pct.textContent = `${String(Math.round(prog.v)).padStart(3, '0')}%`;
        if (bar) bar.style.transform = `scaleX(${prog.v / 100})`;
      },
    });
    lines.forEach((line, i) => {
      const txt = $('.boot-text', line)!;
      const final = txt.dataset.text ?? txt.textContent ?? '';
      txt.textContent = '';
      tl.set(line, { opacity: 1 }, i * 0.28);
      tl.to(txt, { duration: 0.36, scrambleText: { text: final, chars: GLYPHS, speed: 1 } }, i * 0.28);
    });
    tl.to(screen, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.75, ease: 'expo.inOut' }, '+=0.2');

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem('dfx-boot', '1');
      } catch {}
      root.classList.remove('is-booting', 'boot-running');
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      screen.removeEventListener('click', skip);
      resolve();
    };
    const skip = () => {
      tl.progress(1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
    };
    tl.eventCallback('onComplete', finish);
    // Start the hero intro while the shutter is still opening.
    tl.call(() => heroIntro(), [], '-=0.45');
    window.addEventListener('keydown', onKey);
    screen.addEventListener('click', skip);
  });
}

/* ----------------------------------------------------------------- reveals */

function initReveals() {
  if (reduced) return;

  $$('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.from(split.lines, {
      yPercent: 105,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 22,
      autoAlpha: 0,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  gsap.from('.domain', {
    y: 30,
    autoAlpha: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.domains', start: 'top 80%', once: true },
  });

  $$('[data-span]').forEach((row) => {
    const bar = $('[data-span-bar]', row);
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } });
    tl.from(row.children, { y: 16, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 });
    if (bar) tl.from(bar, { scaleX: 0, duration: 1.2, ease: 'expo.inOut' }, 0.1);
  });

  gsap.from('.trace-axis .tick', {
    autoAlpha: 0,
    y: 6,
    duration: 0.6,
    stagger: 0.04,
    scrollTrigger: { trigger: '.trace-axis', start: 'top 90%', once: true },
  });

  $$('[data-module]').forEach((m, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.modules', start: 'top 82%', once: true } });
    tl.from(m, { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out' }, i * 0.12);
    const path = $('[data-draw]', m);
    if (path) tl.from(path, { drawSVG: '0%', duration: 1.2, ease: 'power2.inOut' }, i * 0.12 + 0.3);
  });
}

/* ------------------------------------------------------------------ system */

function initSystem() {
  const svg = $<SVGSVGElement>('.diagram');
  if (!svg) return;
  const label = $('[data-active-label]');
  const cards = $$('[data-domain]');
  let current: string | null = null;

  const activate = (key: string | null) => {
    if (key === current) return;
    current = key;
    svg.classList.toggle('has-active', !!key);
    $$('[data-node]', svg).forEach((n) => n.classList.toggle('is-active', n.getAttribute('data-node') === key));
    $$('[data-edge]', svg).forEach((n) => n.classList.toggle('is-active', n.getAttribute('data-edge') === key));
    $$('[data-flow]', svg).forEach((n) => n.classList.toggle('is-active', n.getAttribute('data-flow') === key));
    cards.forEach((c) => c.classList.toggle('is-active', c.dataset.domain === key));
    if (label) {
      const card = cards.find((c) => c.dataset.domain === key);
      const tag = card?.querySelector('.domain-id')?.textContent ?? '—';
      label.textContent = `activo: ${key ? tag : '—'}`;
    }
  };

  cards.forEach((c) => {
    c.addEventListener('mouseenter', () => activate(c.dataset.domain!));
    c.addEventListener('focus', () => activate(c.dataset.domain!));
  });

  // On wide screens, the card crossing the viewport centre drives the diagram.
  ScrollTrigger.matchMedia({
    '(min-width: 1000px)': () => {
      cards.forEach((c) => {
        ScrollTrigger.create({
          trigger: c,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && activate(c.dataset.domain!),
        });
      });
    },
  });

  if (reduced) return;

  // Reveal: draw the topology in.
  const intro = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
  intro
    .from($$('.ring', svg), { drawSVG: '50% 50%', duration: 1.4, ease: 'expo.inOut', stagger: 0.12 })
    .from($$('.ticks line', svg), { autoAlpha: 0, duration: 0.02, stagger: 0.008 }, 0.2)
    .from($$('.d-hub > *', svg), { scale: 0.6, autoAlpha: 0, transformOrigin: '300px 300px', duration: 0.9, ease: 'back.out(1.6)', stagger: 0.05 }, 0.3)
    .from($$('.edge', svg), { drawSVG: '0%', duration: 1, ease: 'power2.inOut', stagger: 0.08 }, 0.5)
    .from($$('.node', svg), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.8, ease: 'back.out(1.8)', stagger: 0.08 }, 0.8);

  // Ambient loop, only while the diagram is on screen.
  const loop = gsap.timeline({ paused: true, repeat: -1 });
  loop.to($('[data-orbit]', svg), { rotation: 360, svgOrigin: '300 300', duration: 80, ease: 'none' }, 0);
  loop.to($('[data-hub-spin]', svg), { rotation: -360, svgOrigin: '300 300', duration: 40, ease: 'none' }, 0);
  loop.to($('[data-ticks]', svg), { rotation: 360, svgOrigin: '300 300', duration: 160, ease: 'none' }, 0);
  const flows = gsap.to($$('.edge-flow', svg), { strokeDashoffset: -36, duration: 1.4, ease: 'none', repeat: -1, paused: true });
  const packets = $$<SVGCircleElement>('[data-packet]', svg).map((p, i) => {
    const key = p.getAttribute('data-packet');
    const path = $<SVGPathElement>(`[data-flow="${key}"]`, svg);
    return gsap.to(p, {
      motionPath: { path: path!, align: path!, alignOrigin: [0.5, 0.5] },
      duration: 2.2 + (i % 3) * 0.5,
      ease: 'power1.inOut',
      repeat: -1,
      repeatDelay: 0.6 + (i % 4) * 0.35,
      delay: i * 0.4,
      paused: true,
      immediateRender: true,
      onStart: () => p.classList.add('is-on'),
    });
  });
  const all = [loop, flows, ...packets];
  ScrollTrigger.create({
    trigger: svg,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => all.forEach((a) => (self.isActive ? a.play() : a.pause())),
  });
}

/* ----------------------------------------------------------------- contact */

function initContact() {
  const btn = $<HTMLButtonElement>('[data-copy]');
  const lbl = $('[data-copy-label]');
  const status = $('[data-copy-status]');
  if (btn && lbl) {
    let t = 0;
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy!;
      try {
        await navigator.clipboard.writeText(value);
        lbl.textContent = 'Copiado ✓';
        btn.classList.add('is-done');
        if (status) status.textContent = `Dirección ${value} copiada al portapapeles`;
      } catch {
        lbl.textContent = 'Selecciona y copia';
      }
      clearTimeout(t);
      t = window.setTimeout(() => {
        lbl.textContent = 'Copiar';
        btn.classList.remove('is-done');
      }, 2200);
    });
  }

  const email = $('[data-scramble-email]');
  if (email && !reduced) {
    const text = email.textContent ?? '';
    email.closest('a')?.addEventListener('mouseenter', () => {
      gsap.to(email, { duration: 0.7, scrambleText: { text, chars: GLYPHS, speed: 0.5, revealDelay: 0.1 }, overwrite: true });
    });
  }

  const scope = $<HTMLCanvasElement>('[data-scope]');
  if (scope) createScope(scope, reduced);

  // Pointer-follow glow on education modules.
  $$('[data-module]').forEach((m) => {
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      m.style.setProperty('--mx', `${e.clientX - r.left}px`);
      m.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

/* -------------------------------------------------------------------- boot */

async function main() {
  initClock();
  initHeader();
  initTopology();
  initSystem();
  initContact();
  const booting = root.classList.contains('is-booting') && !reduced;
  if (booting) {
    await runBoot();
  } else {
    root.classList.remove('is-booting');
    // Fonts can shift line breaks; split after they settle.
    await document.fonts?.ready;
    heroIntro();
  }
  await document.fonts?.ready;
  initReveals();
  ScrollTrigger.refresh();
}

main();

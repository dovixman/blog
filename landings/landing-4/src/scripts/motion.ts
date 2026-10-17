import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const EASE = 'expo.out';

/* --------------------------------------------------------------------------
   Header: solid on scroll, hides on scroll down, returns on scroll up.
   Runs with or without motion.
   -------------------------------------------------------------------------- */
function initHeader(getScroll: () => number) {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return () => {};
  let last = getScroll();
  return () => {
    const y = getScroll();
    header.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > last + 2;
    const goingUp = y < last - 2;
    if (goingDown && y > window.innerHeight * 0.6 && !header.contains(document.activeElement)) {
      header.classList.add('is-hidden');
    } else if (goingUp || y < 80) {
      header.classList.remove('is-hidden');
    }
    last = y;
  };
}

if (reduceMotion.matches) {
  // No smooth scroll, no animations: only lightweight header state.
  root.classList.remove('motion');
  const update = initHeader(() => window.scrollY);
  window.addEventListener('scroll', update, { passive: true });
  update();
} else {
  bootMotion();
}

function bootMotion() {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------------- Smooth scroll ---------------- */
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const headerUpdate = initHeader(() => lenis.scroll);
  lenis.on('scroll', headerUpdate);
  headerUpdate();

  // Anchor links go through Lenis; focus moves to the target for keyboard users.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      event.preventDefault();
      const isTop = id === '#top';
      lenis.scrollTo(isTop ? 0 : target, {
        offset: isTop ? 0 : -72,
        duration: 1.4,
        onComplete: () => {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        },
      });
      history.replaceState(null, '', id);
    });
  });

  /* ---------------- Scroll progress ---------------- */
  const bar = document.querySelector<HTMLElement>('.progress span');
  if (bar) {
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
  }

  /* ---------------- Reveals (after fonts so line breaks are final) ---------------- */
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    root.classList.add('motion-ready');
    heroIntro();
    scrollReveals();
    ScrollTrigger.refresh();
  });

  /* ---------------- Pointer niceties ---------------- */
  if (finePointer.matches) {
    initMagnetic();
    initCursor();
  }
}

function heroIntro() {
  const lines = gsap.utils.toArray<HTMLElement>('[data-hero-line]');
  const meta = gsap.utils.toArray<HTMLElement>('[data-hero-meta] > *');
  const fades = gsap.utils.toArray<HTMLElement>('[data-hero-fade]');

  const tl = gsap.timeline({ defaults: { ease: EASE } });

  lines.forEach((line) => {
    const split = SplitText.create(line, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(line, { visibility: 'visible' });
    tl.from(split.lines, { yPercent: 105, duration: 1.4, stagger: 0.09 }, lines.indexOf(line) * 0.11 + 0.1);
  });

  tl.to(meta, { opacity: 1, duration: 1, stagger: 0.08, ease: 'power2.out' }, 0.35)
    .fromTo(
      fades,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, clearProps: 'transform' },
      0.75,
    );
}

function scrollReveals() {
  // Line-by-line text reveals.
  gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit(self) {
        gsap.set(el, { visibility: 'visible' });
        return gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.25,
          stagger: 0.08,
          ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      },
    });
  });

  // Soft fade-up blocks, batched so siblings stagger naturally.
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: EASE, clearProps: 'transform' },
      ),
  });

  // Timeline rows draw in from the hairline.
  ScrollTrigger.batch('[data-row]', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.07, ease: EASE, clearProps: 'transform' },
      ),
  });
}

/* --------------------------------------------------------------------------
   Magnetic buttons: element follows the pointer a little, its label a bit more,
   and springs back with a soft elastic release.
   -------------------------------------------------------------------------- */
function initMagnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]');
    const strength = parseFloat(el.dataset.magneticStrength ?? '0.35');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' });
    const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.8, ease: 'power3.out' }) : null;
    const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.8, ease: 'power3.out' }) : null;

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * strength);
      yTo(dy * strength);
      ixTo?.(dx * strength * 0.45);
      iyTo?.(dy * strength * 0.45);
    });

    el.addEventListener('pointerleave', () => {
      const targets = inner ? [el, inner] : [el];
      gsap.to(targets, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)', overwrite: true });
    });
  });
}

/* --------------------------------------------------------------------------
   Cursor: a quiet dot that eases behind the pointer and swells over links.
   -------------------------------------------------------------------------- */
function initCursor() {
  const cursor = document.querySelector<HTMLElement>('.cursor');
  if (!cursor) return;

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });
  let shown = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        cursor.classList.add('is-visible');
        shown = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
    },
    { passive: true },
  );

  document.addEventListener('pointerleave', () => {
    cursor.classList.remove('is-visible');
    shown = false;
  });

  const interactive = 'a, button, [data-row]';
  document.addEventListener('pointerover', (e) => {
    const target = (e.target as Element).closest(interactive);
    if (!target) return;
    const big = (target as HTMLElement).dataset.cursor === 'lg';
    cursor.classList.toggle('is-hidden', big);
    cursor.classList.toggle('is-link', !big && target.matches('a, button'));
  });
  document.addEventListener('pointerout', (e) => {
    const target = (e.target as Element).closest(interactive);
    const next = (e.relatedTarget as Element | null)?.closest(interactive);
    if (target && target !== next) cursor.classList.remove('is-link', 'is-hidden');
  });
}

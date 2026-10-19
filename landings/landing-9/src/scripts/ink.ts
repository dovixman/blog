/**
 * "Ink" layer: hand-drawn strokes trace themselves as the reader scrolls.
 * - Each [data-draw] SVG gets a target progress from its position in the viewport.
 * - The visible progress eases towards that target (so it feels like a pen, not a slider).
 * - Paths inside one SVG are drawn in sequence (line first, then the arrow head).
 * - [data-ink] elements (highlighter marks) receive the same progress as --p.
 * - [data-stick] notes get a one-off "stuck on the page" entrance.
 * Nothing runs with prefers-reduced-motion: the <html class="ink"> flag is never set,
 * so CSS shows every stroke fully drawn.
 */
const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

type Item = {
  el: Element;
  paths: SVGPathElement[];
  current: number;
  target: number;
  /** viewport fraction where drawing starts / ends */
  start: number;
  end: number;
  isMark: boolean;
};

function boot() {
  if (reduce.matches || !root.classList.contains('ink')) {
    root.classList.remove('ink');
    return;
  }

  const items: Item[] = [];

  document.querySelectorAll<SVGSVGElement>('svg[data-draw]').forEach((svg) => {
    const tall = svg.classList.contains('doodle--vline');
    items.push({
      el: svg,
      paths: Array.from(svg.querySelectorAll('path')),
      current: 0,
      target: 0,
      start: tall ? 0.8 : 0.92,
      end: tall ? 0.45 : 0.6,
      isMark: false,
    });
  });

  document.querySelectorAll<HTMLElement>('[data-ink]').forEach((el) => {
    items.push({ el, paths: [], current: 0, target: 0, start: 0.9, end: 0.62, isMark: true });
  });

  let running = false;

  const measure = () => {
    const vh = window.innerHeight;
    for (const item of items) {
      const r = item.el.getBoundingClientRect();
      // Tall strokes (timeline) follow their full height; short ones use their top edge.
      if (item.el.classList.contains('doodle--vline')) {
        const total = r.height + vh * (item.start - item.end);
        item.target = clamp((vh * item.start - r.top) / total);
      } else {
        const anchor = r.top + r.height / 2;
        item.target = clamp((vh * item.start - anchor) / (vh * (item.start - item.end)));
      }
    }
  };

  const paint = (item: Item) => {
    if (item.isMark) {
      (item.el as HTMLElement).style.setProperty('--p', item.current.toFixed(4));
      return;
    }
    const n = item.paths.length;
    item.paths.forEach((path, i) => {
      const local = clamp(item.current * n - i);
      path.style.strokeDashoffset = (1 - local).toFixed(4);
    });
  };

  let last = 0;
  const tick = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    // Frame-rate independent easing: forward strokes ease in like a pen, erasing is quicker.
    const kForward = 1 - Math.exp(-dt / 0.2);
    const kBack = 1 - Math.exp(-dt / 0.08);
    let moving = false;
    for (const item of items) {
      const delta = item.target - item.current;
      if (Math.abs(delta) > 0.0015) {
        // Drawing forward is slower and inky; erasing (scrolling back up) is quicker.
        item.current += delta * (delta > 0 ? kForward : kBack);
        moving = true;
      } else {
        item.current = item.target;
      }
      paint(item);
    }
    running = moving;
    if (moving) requestAnimationFrame(tick);
    else last = 0;
  };

  const request = () => {
    measure();
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  items.forEach(paint);
  root.classList.add('ink-ready');

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  // Give the handwriting font a moment so the hero strokes draw after the text appears.
  const start = () => setTimeout(request, 250);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else start();

  // Post-it entrance.
  const stickers = document.querySelectorAll<HTMLElement>('[data-stick]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-stuck');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    );
    stickers.forEach((el) => io.observe(el));
  } else {
    stickers.forEach((el) => el.classList.add('is-stuck'));
  }

  reduce.addEventListener?.('change', (e) => {
    if (e.matches) {
      root.classList.remove('ink');
      items.forEach((item) => {
        item.current = 1;
        paint(item);
      });
    }
  });
}

function clamp(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

boot();

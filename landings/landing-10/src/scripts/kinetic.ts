/**
 * Kinetic type, driven by scroll (GSAP + ScrollTrigger).
 * The page is fully readable without this file: CSS holds every final state,
 * and nothing here runs when the reader prefers reduced motion.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

function boot() {
  if (reduce.matches || !root.classList.contains('motion')) {
    root.classList.remove('motion');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-ready');

  const mm = gsap.matchMedia();

  mm.add(
    {
      // At least one condition must match for the callback to run: `motion` always does here.
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 900px)',
      fine: '(hover: hover) and (pointer: fine)',
    },
    (ctx) => {
      const { desktop, fine } = ctx.conditions as { desktop: boolean; fine: boolean };

      hero(fine);
      marquees();
      manifesto();
      statement();
      career(desktop);
      areas(desktop);
      reveals();
      contact();

      return () => {
        root.classList.remove('is-horizontal', 'bar-on-accent');
      };
    },
  );

  // Re-measure whenever web fonts finish loading: they change line heights and widths.
  if (document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    document.fonts.addEventListener('loadingdone', () => ScrollTrigger.refresh());
  }
  // Last safety net for late layout shifts (e.g. fonts swapped in after first paint).
  const main = document.querySelector('main');
  if (main && 'ResizeObserver' in window) {
    let lastH = 0;
    let timer = 0;
    new ResizeObserver(([entry]) => {
      const h = Math.round(entry.contentRect.height);
      if (Math.abs(h - lastH) < 2) return;
      lastH = h;
      clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    }).observe(main);
  }
}

/* -------------------------------------------------------------------------- */

function hero(fine: boolean) {
  const title = document.querySelector<HTMLElement>('[data-hero]');
  if (!title) return;
  const chars = gsap.utils.toArray<HTMLElement>('.ch', title);

  // Intro: letters rise from a mask while their weight swells from hairline to black.
  gsap.fromTo(
    chars,
    // y: 0 discards the px offset GSAP would otherwise parse from the CSS start state.
    { y: 0, yPercent: 105, '--w': 100 },
    {
      y: 0,
      yPercent: 0,
      '--w': 860,
      duration: 1.3,
      ease: 'expo.out',
      stagger: { each: 0.055, from: 'start' },
      delay: 0.15,
      onComplete: () => {
        title.querySelectorAll('.hero__row').forEach((r) => ((r as HTMLElement).style.overflow = 'visible'));
        if (fine) proximity(chars);
      },
    },
  );

  gsap.from('.hero__meta, .hero__foot', {
    autoAlpha: 0,
    y: 16,
    duration: 1,
    ease: 'power3.out',
    delay: 0.7,
    stagger: 0.1,
  });

  // Scroll: the name compresses from extra-wide to condensed and drifts apart.
  gsap.fromTo(
    title,
    { '--s': 125 },
    {
      '--s': 50,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
    },
  );
  gsap.to('.hero__row:not(.hero__row--b)', {
    xPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
  gsap.to('.hero__row--b', {
    xPercent: 8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
}

/** Letters near the pointer lose weight, like a lens over the name. */
function proximity(chars: HTMLElement[]) {
  const setters = chars.map((c) => gsap.quickTo(c, '--w', { duration: 0.5, ease: 'power3.out' }));
  let raf = 0;
  let px = -9999;
  let py = -9999;
  const update = () => {
    raf = 0;
    chars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const t = Math.max(0, 1 - d / 320);
      setters[i](860 - t * 760);
    });
  };
  window.addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    px = py = -9999;
    if (!raf) raf = requestAnimationFrame(update);
  });
}

function marquees() {
  const rows = gsap.utils.toArray<HTMLElement>('[data-marquee]');
  const loops = rows.map((row) => {
    const dir = Number(row.dataset.marquee) || -1;
    const track = row.querySelector<HTMLElement>('.marquee__track')!;
    // Two identical sets: moving by -50% loops seamlessly.
    const tween = gsap.fromTo(
      track,
      { xPercent: dir < 0 ? 0 : -50 },
      { xPercent: dir < 0 ? -50 : 0, duration: 38, ease: 'none', repeat: -1 },
    );
    return tween;
  });

  // Scroll velocity speeds the bands up (and flips them when scrolling back).
  let boost = 1;
  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const v = self.getVelocity() / 220;
      boost = gsap.utils.clamp(-6, 6, (self.direction || 1) * (1 + Math.abs(v)));
    },
  });
  gsap.ticker.add(() => {
    boost += ((boost > 0 ? 1 : -1) - boost) * 0.06;
    loops.forEach((t) => t.timeScale(boost));
  });
}

function manifesto() {
  const words = gsap.utils.toArray<HTMLElement>('[data-words] .w');
  if (!words.length) return;
  // Only opacity and transforms here: changing width or weight would re-wrap the
  // paragraph mid-scroll and shift every ScrollTrigger below it.
  gsap.fromTo(
    words,
    { opacity: 0.12, yPercent: 18 },
    {
      opacity: 1,
      yPercent: 0,
      ease: 'none',
      stagger: 0.06,
      scrollTrigger: { trigger: '.manifesto__text', start: 'top 82%', end: 'bottom 45%', scrub: 0.5 },
    },
  );
}

function statement() {
  gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((line) => {
    const dir = Number(line.dataset.drift) || 1;
    gsap.fromTo(
      line.querySelector('span'),
      { xPercent: dir * -18 },
      {
        xPercent: dir * 8,
        ease: 'none',
        scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: 0.4 },
      },
    );
  });
  // The outline line breathes in width as it crosses the viewport.
  gsap.fromTo(
    '.statement__line--outline',
    { fontVariationSettings: "'wdth' 50, 'wght' 200" },
    {
      fontVariationSettings: "'wdth' 150, 'wght' 500",
      ease: 'none',
      scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: 0.4 },
    },
  );
}

function career(desktop: boolean) {
  const track = document.querySelector<HTMLElement>('[data-track]');
  if (!track) return;
  const jobs = gsap.utils.toArray<HTMLElement>('.job', track);
  const section = track.closest<HTMLElement>('.career')!;
  const distance = () => (desktop ? track.scrollWidth - window.innerWidth : 0);

  // The fixed bar switches ink while it floats over the orange section.
  // (Measured by hand: a trigger on the pinned element itself ignores its own pin spacing.)
  ScrollTrigger.create({
    trigger: section,
    start: 'top 40px',
    end: () => `+=${distance() + section.offsetHeight}`,
    invalidateOnRefresh: true,
    onToggle: (self) => root.classList.toggle('bar-on-accent', self.isActive),
  });

  if (desktop) {
    root.classList.add('is-horizontal');
    const scroller = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.career',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });

    jobs.forEach((job, i) => {
      const years = job.querySelector('.job__years');
      const role = job.querySelector('.mask__in');
      gsap.fromTo(
        years,
        { fontVariationSettings: "'wdth' 50, 'wght' 200" },
        {
          fontVariationSettings: "'wdth' 130, 'wght' 900",
          ease: 'none',
          scrollTrigger: {
            trigger: job,
            containerAnimation: scroller,
            start: 'left 95%',
            end: 'left 35%',
            scrub: true,
          },
        },
      );
      // The first panel is already in view when the pin starts: reveal it from the vertical scroll.
      const st =
        i === 0
          ? { trigger: section, start: 'top 55%', toggleActions: 'play none none reverse' }
          : { trigger: job, containerAnimation: scroller, start: 'left 70%', toggleActions: 'play none none reverse' };
      gsap.from(role, { yPercent: 110, duration: 0.9, ease: 'expo.out', scrollTrigger: st });
    });
  } else {
    jobs.forEach((job) => {
      gsap.fromTo(
        job.querySelector('.job__years'),
        { fontVariationSettings: "'wdth' 50, 'wght' 200" },
        {
          fontVariationSettings: "'wdth' 130, 'wght' 900",
          ease: 'none',
          scrollTrigger: { trigger: job, start: 'top 95%', end: 'top 45%', scrub: 0.4 },
        },
      );
      gsap.from(job.querySelector('.mask__in'), {
        yPercent: 110,
        duration: 0.9,
        ease: 'expo.out',
        scrollTrigger: { trigger: job, start: 'top 75%', toggleActions: 'play none none reverse' },
      });
    });
  }
}

function areas(desktop: boolean) {
  // Lines never wrap (see CSS), so the width axis can swing freely without moving the layout.
  gsap.utils.toArray<HTMLElement>('[data-area]').forEach((row) => {
    gsap.fromTo(
      row,
      { '--s': 50, '--w': 150 },
      {
        '--s': desktop ? 150 : 112,
        '--w': 800,
        ease: 'none',
        scrollTrigger: { trigger: row, start: 'top 98%', end: 'top 55%', scrub: 0.5 },
      },
    );
  });
}

function reveals() {
  gsap.utils.toArray<HTMLElement>('.edu .mask__in').forEach((el) => {
    gsap.from(el, {
      yPercent: 110,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
    });
  });
}

function contact() {
  const chars = gsap.utils.toArray<HTMLElement>('[data-contact] .ch');
  gsap.fromTo(
    chars,
    { '--w': 100, yPercent: 30 },
    {
      '--w': 800,
      yPercent: 0,
      ease: 'none',
      stagger: 0.05,
      scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'top 25%', scrub: 0.5 },
    },
  );
  gsap.fromTo(
    '[data-contact]',
    { '--s': 50 },
    {
      '--s': 120,
      ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'top 25%', scrub: 0.5 },
    },
  );
}

boot();

// Progressive enhancement entry point.
// 1. Navigation (index, rail, active station) works for everyone.
// 2. The WebGL universe is lazy-loaded only when WebGL exists and the visitor
//    has not asked for reduced motion (or explicitly turned it on).

const PREF_KEY = 'dovixman:universe';

function readPref() {
  try {
    return window.localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

function writePref(value) {
  try {
    window.localStorage.setItem(PREF_KEY, value);
  } catch {
    /* storage unavailable: preference lasts for this visit only */
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function setupNavigation() {
  const sections = [...document.querySelectorAll('main > .station')];
  const links = [...document.querySelectorAll('.rail a, .menu-panel a')];
  const menu = document.getElementById('menu');

  // Close the index after choosing a destination, and with Escape.
  document.querySelectorAll('.menu-panel a').forEach((a) =>
    a.addEventListener('click', () => {
      menu?.removeAttribute('open');
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.hasAttribute('open')) {
      menu.removeAttribute('open');
      menu.querySelector('summary')?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (menu?.hasAttribute('open') && e.target instanceof Node && !menu.contains(e.target)) menu.removeAttribute('open');
  });

  const setActive = (id) => {
    const accent = document.getElementById(id)?.style.getPropertyValue('--accent');
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      if (on) {
        a.setAttribute('aria-current', 'true');
        if (accent) a.style.setProperty('--rail-accent', accent);
      } else a.removeAttribute('aria-current');
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );
  sections.forEach((s) => io.observe(s));
  return sections;
}

export function boot() {
  const root = document.documentElement;
  const sectionEls = setupNavigation();
  const toggle = document.getElementById('mode-toggle');
  const container = document.getElementById('universe');
  if (!toggle || !container) return;

  if (!hasWebGL()) return; // static universe only; toggle stays hidden

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pref = readPref();
  let enabled = pref ? pref === 'on' : !reduceMotion.matches;
  let universe = null;
  let loading = null;

  toggle.hidden = false;
  const label = toggle.querySelector('.mode-label');

  const reflect = () => {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.title = enabled ? 'Desactivar el universo 3D (versión estática)' : 'Activar el universo 3D';
    if (label) label.textContent = enabled ? 'Universo 3D' : 'Activar 3D';
  };

  const fail = () => {
    universe?.stop();
    root.classList.remove('is-3d');
    toggle.hidden = true;
    enabled = false;
  };

  async function load() {
    if (universe) return universe;
    if (!loading) {
      loading = import('./universe.js').then(({ createUniverse }) => {
        const sections = sectionEls.map((el) => ({
          el,
          id: el.id,
          label: el.querySelector('.station-title, .hero-title')?.textContent?.trim() ?? el.id,
          title: el.querySelector('.station-title, .hero-title')?.textContent?.trim() ?? el.id,
          accent: el.style.getPropertyValue('--accent').trim() || '#ffffff',
        }));
        // Short labels for the HUD come from the index.
        sections.forEach((s) => {
          const link = document.querySelector(`.menu-panel a[href="#${s.id}"] span:last-child`);
          if (link) s.label = link.textContent.trim();
        });
        universe = createUniverse({
          container,
          sections,
          onFail: fail,
          tooltip: document.getElementById('tooltip'),
          hud: {
            station: document.getElementById('hud-station'),
            coords: document.getElementById('hud-coords'),
          },
        });
        return universe;
      });
    }
    return loading;
  }

  // Switching modes changes section heights: keep the visitor on the same station.
  const currentStation = () =>
    sectionEls.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= window.innerHeight / 2 && r.bottom >= window.innerHeight / 2;
    });
  const keepPlace = (el) => {
    if (el && el !== sectionEls[0]) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  };

  async function enable() {
    try {
      const u = await load();
      if (!enabled) return;
      const here = currentStation();
      u.start();
      root.classList.add('is-3d');
      keepPlace(here);
      // section heights change in 3D mode: re-measure after layout settles
      requestAnimationFrame(() => u.remeasure());
    } catch (err) {
      console.warn('[universe] WebGL scene unavailable, staying in static mode.', err);
      fail();
    }
  }

  function disable() {
    const here = currentStation();
    root.classList.remove('is-3d');
    keepPlace(here);
    universe?.stop();
  }

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    writePref(enabled ? 'on' : 'off');
    reflect();
    if (enabled) enable();
    else disable();
  });

  reflect();

  if (enabled) {
    // Defer the 3D chunk until the page is idle so the HTML paints first.
    const go = () => enable();
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 1500 });
    else window.setTimeout(go, 300);
  }
}

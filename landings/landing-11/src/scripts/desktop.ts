// Gestor de ventanas del escritorio: abrir, enfocar, arrastrar, minimizar, ampliar y cerrar.

type WinState = 'closed' | 'open' | 'minimized';

const root = document.documentElement;
const desktop = document.querySelector<HTMLElement>('.desktop')!;
const tray = document.querySelector<HTMLElement>('[data-tray]')!;
const announcer = document.querySelector<HTMLElement>('[data-announcer]')!;
const mobileMq = window.matchMedia('(max-width: 720px)');
const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

const wins = new Map<string, HTMLElement>();
const state = new Map<string, WinState>();
const openers = new Map<string, HTMLElement>();
let z = 20;

// Posiciones iniciales relativas (fracción del ancho útil, px desde arriba).
const defaults: Record<string, [number, number]> = {
  sobre: [0.56, 52],
  trayectoria: [0.031, 376],
  formacion: [0.3, 120],
  areas: [0.2, 84],
  contacto: [0.5, 196],
  blog: [0.62, 260],
};

document.querySelectorAll<HTMLElement>('.win').forEach((el) => {
  const id = el.dataset.win!;
  wins.set(id, el);
  state.set(id, 'closed');
  el.hidden = true;
  el.setAttribute('role', 'dialog');
});

const label = (id: string) => wins.get(id)!.querySelector('.win__title span')!.textContent!.trim();
const iconFor = (id: string) => document.querySelector<HTMLElement>(`[data-icon="${id}"]`)!;
const isMobile = () => mobileMq.matches;

function announce(msg: string) {
  announcer.textContent = '';
  requestAnimationFrame(() => (announcer.textContent = msg));
}

function bounds() {
  return { w: desktop.clientWidth, h: desktop.clientHeight };
}

function clampPos(el: HTMLElement, x: number, y: number) {
  const { w, h } = bounds();
  const ww = el.offsetWidth;
  const minVisible = 96;
  return {
    x: Math.round(Math.min(Math.max(x, minVisible - ww), w - minVisible)),
    y: Math.round(Math.min(Math.max(y, 0), h - 32)),
  };
}

function place(el: HTMLElement, x: number, y: number) {
  const p = clampPos(el, x, y);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
}

function initialPlace(id: string, el: HTMLElement) {
  if (el.dataset.placed) return;
  el.dataset.placed = '1';
  const usable = bounds().w - 150;
  const [fx, y] = defaults[id] ?? [0.2, 80];
  let x = Math.round(usable * fx);
  // que no tape la columna de iconos
  x = Math.min(x, usable - el.offsetWidth);
  place(el, Math.max(16, x), y);
}

function sync() {
  wins.forEach((_, id) => {
    const s = state.get(id)!;
    const icon = iconFor(id);
    icon.setAttribute('aria-expanded', String(s === 'open'));
    document.querySelectorAll<HTMLElement>(`[data-state-for="${id}"]`).forEach((m) => {
      m.dataset.state = s;
    });
  });

  // bandeja de ventanas minimizadas
  tray.replaceChildren();
  wins.forEach((_, id) => {
    if (state.get(id) !== 'minimized') return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.dataset.restore = id;
    b.textContent = label(id);
    b.setAttribute('aria-label', `Restaurar ${label(id)}`);
    tray.append(b);
  });
  tray.hidden = tray.childElementCount === 0;
}

function topmostOpen(): string | null {
  let best: string | null = null;
  let bestZ = -1;
  wins.forEach((el, id) => {
    if (state.get(id) !== 'open') return;
    const zi = Number(el.style.zIndex || 0);
    if (zi > bestZ) {
      bestZ = zi;
      best = id;
    }
  });
  return best;
}

function focusWin(id: string) {
  const el = wins.get(id)!;
  wins.forEach((w) => w.classList.toggle('is-active', w === el));
  if (el.style.zIndex !== String(z)) el.style.zIndex = String(++z);
}

function moveFocusInto(id: string) {
  wins.get(id)!.querySelector<HTMLElement>('.win__title')!.focus({ preventScroll: true });
}

function zoomRects(from: DOMRect, to: DOMRect): Promise<void> {
  if (reducedMq.matches || typeof Element.prototype.animate !== 'function') return Promise.resolve();
  const frames = [
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` },
  ];
  const rects = [0, 40, 80].map((delay) => {
    const r = document.createElement('div');
    r.className = 'zoomrect';
    r.setAttribute('aria-hidden', 'true');
    Object.assign(r.style, frames[0]);
    document.body.append(r);
    const anim = r.animate(frames, { duration: 190, delay, easing: 'steps(6, end)', fill: 'both' });
    return anim.finished.then(() => r.remove());
  });
  return Promise.all(rects).then(() => undefined);
}

async function openWin(id: string, opts: { focus?: boolean; opener?: HTMLElement | null; animate?: boolean } = {}) {
  const el = wins.get(id);
  if (!el) return;
  const { focus = true, opener = null, animate = true } = opts;
  if (opener) openers.set(id, opener);

  if (state.get(id) === 'open') {
    focusWin(id);
    if (focus) moveFocusInto(id);
    return;
  }

  const wasMinimized = state.get(id) === 'minimized';
  const source = (wasMinimized && tray.querySelector<HTMLElement>(`[data-restore="${id}"]`)) || iconFor(id);
  const from = source.getBoundingClientRect();

  // medir el destino sin mostrar la ventana
  el.style.visibility = 'hidden';
  el.hidden = false;
  if (!isMobile()) initialPlace(id, el);
  const to = el.getBoundingClientRect();

  state.set(id, 'open');
  focusWin(id);
  sync();

  if (animate) await zoomRects(from, to);
  el.style.visibility = '';
  if (focus) moveFocusInto(id);
  announce(`${label(id)} abierta`);
}

function closeWin(id: string, how: 'closed' | 'minimized' = 'closed') {
  const el = wins.get(id);
  if (!el || state.get(id) !== 'open') return;
  const hadFocus = el.contains(document.activeElement);
  el.hidden = true;
  el.classList.remove('is-active', 'is-dragging');
  state.set(id, how);
  sync();
  announce(`${label(id)} ${how === 'closed' ? 'cerrada' : 'minimizada'}`);

  const next = topmostOpen();
  if (next) focusWin(next);

  if (hadFocus || document.activeElement === document.body) {
    if (how === 'minimized') {
      tray.querySelector<HTMLElement>(`[data-restore="${id}"]`)?.focus();
    } else {
      const back = openers.get(id);
      (back && back.isConnected && !back.closest('[hidden]') ? back : iconFor(id)).focus();
    }
  }
}

function toggleZoom(id: string) {
  const el = wins.get(id)!;
  const zoomed = el.classList.toggle('is-zoomed');
  el.querySelector('[data-action="zoom"]')!.setAttribute('aria-pressed', String(zoomed));
  focusWin(id);
}

/* ——————————————— iconos: clic selecciona, doble clic abre; teclado y táctil abren */

let lastPointer = 'mouse';
desktop.addEventListener('pointerdown', (e) => {
  lastPointer = e.pointerType;
  const t = e.target as HTMLElement;
  if (!t.closest('.icon')) document.querySelectorAll('.icon.is-selected').forEach((i) => i.classList.remove('is-selected'));
});

document.querySelectorAll<HTMLElement>('.icon').forEach((icon) => {
  const id = icon.dataset.icon!;
  icon.addEventListener('click', (e) => {
    document.querySelectorAll('.icon.is-selected').forEach((i) => i !== icon && i.classList.remove('is-selected'));
    icon.classList.add('is-selected');
    if (e.detail === 0 || lastPointer !== 'mouse') openWin(id, { opener: icon });
  });
  icon.addEventListener('dblclick', () => openWin(id, { opener: icon }));
});

/* ——————————————— controles de ventana, foco y arrastre */

wins.forEach((el, id) => {
  el.addEventListener('pointerdown', () => focusWin(id));
  el.addEventListener('focusin', () => focusWin(id));
  el.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'close') closeWin(id);
    else if (action === 'minimize') closeWin(id, 'minimized');
    else if (action === 'zoom') toggleZoom(id);
  });

  const bar = el.querySelector<HTMLElement>('[data-drag]')!;
  bar.addEventListener('dblclick', (e) => {
    if (!(e.target as HTMLElement).closest('button') && !isMobile()) toggleZoom(id);
  });

  bar.addEventListener('pointerdown', (e) => {
    if (isMobile() || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    if (el.classList.contains('is-zoomed')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = el.offsetLeft;
    const oy = el.offsetTop;
    bar.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');

    const move = (ev: PointerEvent) => place(el, ox + ev.clientX - startX, oy + ev.clientY - startY);
    const up = () => {
      el.classList.remove('is-dragging');
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  });

  // mover con teclado: flechas sobre el título enfocado (Mayús = paso grande)
  el.querySelector<HTMLElement>('.win__title')!.addEventListener('keydown', (e) => {
    if (isMobile() || el.classList.contains('is-zoomed')) return;
    const step = e.shiftKey ? 48 : 12;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    place(el, el.offsetLeft + v[0], el.offsetTop + v[1]);
  });
});

tray.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-restore]');
  if (b) openWin(b.dataset.restore!);
});

// botones dentro de ventanas que abren otras ventanas
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
  if (t && !t.closest('.menu__panel')) openWin(t.dataset.open!, { opener: t });
});

/* ——————————————— menús */

const triggers = Array.from(document.querySelectorAll<HTMLButtonElement>('.menu__trigger'));
let openMenu: HTMLButtonElement | null = null;

const panelOf = (t: HTMLButtonElement) => document.getElementById(t.getAttribute('aria-controls')!)!;
const itemsOf = (t: HTMLButtonElement) => Array.from(panelOf(t).querySelectorAll<HTMLElement>('[role="menuitem"]'));

function showMenu(t: HTMLButtonElement, focusFirst = false) {
  if (openMenu && openMenu !== t) hideMenu(false);
  openMenu = t;
  t.setAttribute('aria-expanded', 'true');
  panelOf(t).hidden = false;
  if (focusFirst) itemsOf(t)[0]?.focus();
}

function hideMenu(returnFocus = true) {
  if (!openMenu) return;
  const t = openMenu;
  t.setAttribute('aria-expanded', 'false');
  panelOf(t).hidden = true;
  openMenu = null;
  if (returnFocus) t.focus();
}

triggers.forEach((t, i) => {
  t.addEventListener('click', (e) => {
    if (openMenu === t) hideMenu(false);
    else showMenu(t, (e as MouseEvent).detail === 0);
  });
  t.addEventListener('pointerenter', () => {
    if (openMenu && openMenu !== t) showMenu(t);
  });
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      showMenu(t, true);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = triggers[(i + (e.key === 'ArrowRight' ? 1 : triggers.length - 1)) % triggers.length];
      if (openMenu) showMenu(n, true);
      n.focus();
    }
  });

  const panel = panelOf(t);
  panel.addEventListener('keydown', (e) => {
    const items = itemsOf(t);
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      items[(idx + d + items.length) % items.length].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1].focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = triggers[(i + (e.key === 'ArrowRight' ? 1 : triggers.length - 1)) % triggers.length];
      showMenu(n, true);
    } else if (e.key === 'Tab') {
      hideMenu(false);
    }
  });
  panel.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]');
    if (!item) return;
    if (item.dataset.open) {
      hideMenu(false);
      openWin(item.dataset.open, { opener: t });
    } else if (item.hasAttribute('data-close-all')) {
      hideMenu(true);
      wins.forEach((_, id) => closeWin(id));
      t.focus();
    } else {
      hideMenu(false);
    }
  });
});

document.addEventListener('pointerdown', (e) => {
  if (openMenu && !(e.target as HTMLElement).closest('.menu')) hideMenu(false);
});

/* ——————————————— Esc */

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (openMenu) {
    e.preventDefault();
    hideMenu(true);
    return;
  }
  const active = document.activeElement as HTMLElement | null;
  const inWin = active?.closest<HTMLElement>('.win');
  const id = inWin?.dataset.win ?? topmostOpen();
  if (id && state.get(id) === 'open') {
    e.preventDefault();
    closeWin(id);
    if (!inWin) iconFor(id).focus();
  }
});

/* ——————————————— reloj */

const clock = document.querySelector<HTMLTimeElement>('[data-clock]');
const fmtDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const fmtTime = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
function tick() {
  if (!clock) return;
  const now = new Date();
  const day = fmtDay.format(now).replace('.', '');
  clock.textContent = `${day.charAt(0).toUpperCase()}${day.slice(1)} ${fmtTime.format(now)}`;
  clock.dateTime = now.toISOString();
}
tick();
setInterval(tick, 10_000);

/* ——————————————— resize: mantener ventanas dentro */

window.addEventListener('resize', () => {
  if (isMobile()) return;
  wins.forEach((el, id) => {
    if (state.get(id) === 'open' && el.dataset.placed) place(el, el.offsetLeft, el.offsetTop);
  });
});

/* ——————————————— estado inicial */

sync();
if (!isMobile()) {
  openWin('trayectoria', { focus: false, animate: false });
  openWin('sobre', { focus: false, animate: false });
}
root.classList.add('desktop-ready');

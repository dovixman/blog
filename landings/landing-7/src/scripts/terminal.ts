// Progressive enhancement: the page ships the whole transcript as static HTML.
// This script reads those blocks as the source of each command's output,
// clears the screen and turns it into an interactive terminal.

const log = document.getElementById('log') as HTMLDivElement | null;
const form = document.getElementById('prompt') as HTMLFormElement | null;
const input = document.getElementById('cmd') as HTMLInputElement | null;
const cursor = document.getElementById('cursor') as HTMLSpanElement | null;
const screen = document.getElementById('screen') as HTMLElement | null;
const clock = document.getElementById('clock');

if (log && form && input && cursor && screen) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const outputs = new Map<string, string>();
  log.querySelectorAll<HTMLElement>('[data-out]').forEach((el) => {
    const key = el.dataset.out!;
    const out = el.querySelector('.out');
    outputs.set(key, out ? out.innerHTML : el.innerHTML);
  });
  const tpl = (id: string) => (document.getElementById(id) as HTMLTemplateElement | null)?.innerHTML ?? '';
  outputs.set('help', tpl('tpl-help'));
  outputs.set('ls', tpl('tpl-ls'));

  const files: Record<string, string> = {
    'experiencia.txt': 'experiencia',
    'formacion.txt': 'formacion',
    'areas.txt': 'areas',
    'contacto.txt': 'contacto',
  };

  const commandNames = ['help', 'whoami', 'experiencia', 'formacion', 'areas', 'contacto', 'blog', 'ls', 'cat', 'clear'];
  const fileNames = ['cv.txt', ...Object.keys(files)];

  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

  const scrollDown = () => {
    screen.scrollTop = screen.scrollHeight;
  };

  function append(html: string, cls = '') {
    const el = document.createElement('div');
    el.className = `block ${cls}`.trim();
    el.innerHTML = html;
    log!.appendChild(el);
    scrollDown();
    return el;
  }

  function echo(cmd: string) {
    return `<p class="echo"><span class="ps1" aria-hidden="true">david@dovixman:~$</span> ${escapeHtml(cmd)}</p>`;
  }

  function cv() {
    const parts: [string, string][] = [
      ['whoami', 'PERFIL'],
      ['experiencia', 'EXPERIENCIA'],
      ['formacion', 'FORMACIÓN'],
      ['areas', 'ÁREAS'],
      ['contacto', 'CONTACTO'],
    ];
    return parts
      .map(([k, label]) => `<p class="rule"><span>${label}</span></p><div class="out">${outputs.get(k)}</div>`)
      .join('');
  }

  function run(raw: string) {
    const cmd = raw.trim().replace(/\s+/g, ' ');
    if (cmd) {
      history.push(cmd);
    }
    histIndex = history.length;
    draft = '';

    const [name, ...args] = cmd.split(' ');
    const lower = (name || '').toLowerCase();

    if (lower === 'clear') {
      log!.innerHTML = '';
      return;
    }

    let body = '';
    if (!cmd) {
      body = '';
    } else if (lower === 'cat') {
      const file = args[0];
      if (!file) body = `<p class="err">cat: falta un operando. Prueba <kbd>cat cv.txt</kbd></p>`;
      else if (file === 'cv.txt') body = cv();
      else if (files[file]) body = `<div class="out">${outputs.get(files[file])}</div>`;
      else body = `<p class="err">cat: ${escapeHtml(file)}: No existe el fichero. Prueba <kbd>ls</kbd></p>`;
    } else if (lower === 'formación') {
      body = `<div class="out">${outputs.get('formacion')}</div>`;
    } else if (lower === 'banner' || lower === 'welcome') {
      body = `<div class="out">${outputs.get('banner')}</div>`;
    } else if (outputs.has(lower) && lower !== 'banner') {
      body = `<div class="out">${outputs.get(lower)}</div>`;
    } else {
      body = `<p class="err">${escapeHtml(name)}: comando no encontrado. Escribe <kbd>help</kbd> para ver la lista.</p>`;
    }
    append(echo(cmd) + body);
  }

  // ---------------------------------------------------------------- history
  const history: string[] = [];
  let histIndex = 0;
  let draft = '';

  // ---------------------------------------------------------------- cursor
  function syncCursor() {
    const pos = input!.selectionStart ?? input!.value.length;
    const offset = pos - (input!.scrollLeft / (parseFloat(getComputedStyle(input!).fontSize) * 0.6));
    cursor!.style.setProperty('--x', String(Math.max(0, offset)));
    cursor!.textContent = input!.value[pos] ?? ' ';
  }
  ['input', 'keyup', 'click', 'select', 'focus'].forEach((ev) => input.addEventListener(ev, () => requestAnimationFrame(syncCursor)));
  input.addEventListener('focus', () => form.classList.add('is-focus'));
  input.addEventListener('blur', () => form.classList.remove('is-focus'));

  // ---------------------------------------------------------------- completion
  function complete() {
    const value = input!.value;
    const parts = value.trimStart().split(/\s+/);
    let candidates: string[];
    let prefix: string;
    let head = '';
    if (parts.length <= 1) {
      prefix = parts[0] ?? '';
      candidates = commandNames.filter((c) => c.startsWith(prefix.toLowerCase()));
    } else if (parts[0] === 'cat' && parts.length === 2) {
      prefix = parts[1];
      head = 'cat ';
      candidates = fileNames.filter((f) => f.startsWith(prefix));
    } else {
      return;
    }
    if (candidates.length === 1) {
      const done = candidates[0];
      input!.value = head + done + (done === 'cat' ? ' ' : '');
    } else if (candidates.length > 1) {
      let common = candidates[0];
      for (const c of candidates) while (!c.startsWith(common)) common = common.slice(0, -1);
      if (common.length > prefix.length) input!.value = head + common;
      else append(echo(value) + `<p class="ls">${candidates.map((c) => `<span>${c}</span>`).join('')}</p>`);
    }
    input!.setSelectionRange(input!.value.length, input!.value.length);
    syncCursor();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && input.value.trim()) {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      if (histIndex === history.length) draft = input.value;
      histIndex = Math.max(0, histIndex - 1);
      input.value = history[histIndex];
      requestAnimationFrame(() => {
        input.setSelectionRange(input.value.length, input.value.length);
        syncCursor();
      });
    } else if (e.key === 'ArrowDown') {
      if (histIndex >= history.length) return;
      e.preventDefault();
      histIndex = Math.min(history.length, histIndex + 1);
      input.value = histIndex === history.length ? draft : history[histIndex];
      requestAnimationFrame(() => {
        input.setSelectionRange(input.value.length, input.value.length);
        syncCursor();
      });
    } else if ((e.key === 'l' || e.key === 'L') && e.ctrlKey) {
      e.preventDefault();
      run('clear');
    } else if ((e.key === 'c' || e.key === 'C') && e.ctrlKey && !input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0)) {
      e.preventDefault();
      append(echo(input.value + '^C'));
      input.value = '';
      syncCursor();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = '';
    run(value);
    syncCursor();
  });

  // Click a suggestion or a command inside the output.
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-run]');
    if (btn) {
      run(btn.dataset.run!);
      if (finePointer) input.focus({ preventScroll: true });
      requestAnimationFrame(scrollDown);
      return;
    }
    // Clicking empty terminal space focuses the prompt (unless selecting text or clicking a link).
    if (
      screen.contains(e.target as Node) &&
      !(e.target as HTMLElement).closest('a, button, input') &&
      !window.getSelection()?.toString()
    ) {
      input.focus({ preventScroll: true });
    }
  });

  // ---------------------------------------------------------------- clock
  if (clock) {
    const fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 15000);
  }

  // ---------------------------------------------------------------- boot
  const bootLines = [
    ['ok', 'montando /home/david'],
    ['ok', 'cargando experiencia · 7 puestos desde 2012'],
    ['ok', 'cargando formación · grado + 2 másteres'],
    ['ok', 'conectando con dovixman.io'],
  ];

  function finishBoot() {
    log!.innerHTML = '';
    log!.removeAttribute('aria-busy');
    append(`<div class="out">${outputs.get('banner')}</div>`, 'block--banner');
    document.documentElement.classList.add('booted');
    if (finePointer) input!.focus({ preventScroll: true });
    syncCursor();
    autoType(finePointer ? 'help' : 'whoami');
  }

  // Types a first command for the visitor; any interaction cancels it.
  function autoType(text: string) {
    if (reduce.matches) {
      run(text);
      return;
    }
    let i = 0;
    let t = 0;
    const cancel = () => {
      window.clearTimeout(t);
      if (input!.value === text.slice(0, i)) input!.value = '';
      syncCursor();
      stop();
    };
    const stop = () => {
      window.removeEventListener('keydown', cancel, true);
      window.removeEventListener('pointerdown', cancel, true);
    };
    window.addEventListener('keydown', cancel, true);
    window.addEventListener('pointerdown', cancel, true);
    const tick = () => {
      input!.value = text.slice(0, ++i);
      syncCursor();
      if (i < text.length) t = window.setTimeout(tick, 70 + Math.random() * 60);
      else
        t = window.setTimeout(() => {
          stop();
          input!.value = '';
          run(text);
          syncCursor();
        }, 380);
    };
    t = window.setTimeout(tick, 450);
  }

  if (reduce.matches) {
    finishBoot();
  } else {
    log.setAttribute('aria-busy', 'true');
    log.innerHTML = '';
    const boot = append('', 'boot');
    let i = 0;
    let timer = 0;
    const skip = () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      finishBoot();
    };
    const step = () => {
      if (i < bootLines.length) {
        const [s, text] = bootLines[i++];
        boot.insertAdjacentHTML('beforeend', `<p><span class="ok">[ ${s} ]</span> ${text}</p>`);
        timer = window.setTimeout(step, 140 + Math.random() * 90);
      } else {
        timer = window.setTimeout(skip, 360);
      }
    };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    timer = window.setTimeout(step, 120);
  }
}

// Oscilloscope-style carrier waves behind the contact section. Decorative only.

export function createScope(canvas: HTMLCanvasElement, reduced: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;
  let visible = false;
  let t0 = 0;
  const pointer = { x: 0.7, target: 0.7, energy: 0, targetEnergy: 0 };

  const waves = [
    { y: 0.7, amp: 26, f: 1.6, s: 0.35, a: 0.42, w: 1.2 },
    { y: 0.76, amp: 18, f: 2.7, s: -0.5, a: 0.22, w: 1 },
    { y: 0.82, amp: 12, f: 4.1, s: 0.8, a: 0.14, w: 1 },
  ];

  function size() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function draw(time: number) {
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, w, h);

    // graticule
    ctx!.strokeStyle = 'rgba(196, 214, 230, 0.05)';
    ctx!.lineWidth = 1;
    const step = 64;
    ctx!.beginPath();
    for (let x = (w % step) / 2; x < w; x += step) {
      ctx!.moveTo(Math.round(x) + 0.5, h * 0.55);
      ctx!.lineTo(Math.round(x) + 0.5, h);
    }
    ctx!.stroke();

    pointer.x += (pointer.target - pointer.x) * 0.06;
    pointer.energy += (pointer.targetEnergy - pointer.energy) * 0.05;

    for (const wv of waves) {
      ctx!.strokeStyle = `rgba(124, 240, 197, ${wv.a})`;
      ctx!.lineWidth = wv.w;
      ctx!.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const u = x / w;
        const env = Math.exp(-Math.pow((u - pointer.x) / 0.18, 2));
        const amp = wv.amp * (0.45 + env * (0.8 + pointer.energy * 1.4));
        const y =
          h * wv.y +
          Math.sin(u * Math.PI * 2 * wv.f + time * wv.s) * amp +
          Math.sin(u * Math.PI * 2 * wv.f * 2.3 - time * wv.s * 1.7) * amp * 0.25;
        if (x === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
    }
  }

  function frame(t: number) {
    if (!running) return;
    if (!t0) t0 = t;
    draw((t - t0) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  size();
  draw(0);

  window.addEventListener('resize', () => {
    size();
    draw(0);
  });
  const host = canvas.parentElement!;
  host.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.target = (e.clientX - r.left) / r.width;
    pointer.targetEnergy = 1;
  });
  host.addEventListener('pointerleave', () => (pointer.targetEnergy = 0));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

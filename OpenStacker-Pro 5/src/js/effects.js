const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealObserver;
let frameId = 0;

export function initAmbientCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas || reducedMotion) return () => {};
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return () => {};
  const points = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastTime = 0;
  const count = Math.min(36, Math.floor(window.innerWidth / 38));
  const makePoint = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - .5) * .12,
    vy: (Math.random() - .5) * .10,
    size: Math.random() * 1.3 + .35,
    alpha: Math.random() * .45 + .12
  });
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    points.length = 0;
    for (let i = 0; i < count; i++) points.push(makePoint());
  };
  const draw = (time = 0) => {
    if (document.hidden) { frameId = 0; return; }
    if (time - lastTime < 42) { frameId = requestAnimationFrame(draw); return; }
    lastTime = time;
    context.clearRect(0, 0, width, height);
    const light = document.documentElement.dataset.theme === 'light';
    const color = light ? '64, 97, 146' : '155, 245, 207';
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color},${p.alpha * (light ? .36 : .78)})`;
      context.fill();
      for (let j = i + 1; j < points.length; j++) {
        const q = points[j];
        const dx = q.x - p.x; const dy = q.y - p.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 105) {
          context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(q.x, q.y);
          context.strokeStyle = `rgba(${color},${(1 - distance / 105) * .075})`;
          context.lineWidth = .6; context.stroke();
        }
      }
    }
    frameId = requestAnimationFrame(draw);
  };
  resize();
  frameId = requestAnimationFrame(draw);
  const onVisibility = () => {
    if (document.hidden && frameId) { cancelAnimationFrame(frameId); frameId = 0; }
    else if (!document.hidden && !frameId) frameId = requestAnimationFrame(draw);
  };
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    if (frameId) cancelAnimationFrame(frameId);
  };
}

export function resetReveals() {
  if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
}

// One persistent observer: observing new nodes never drops the ones already watched.
export function activateReveals(root = document) {
  const targets = root.querySelectorAll('.reveal:not(.is-visible)');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach(element => element.classList.add('is-visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
  }
  targets.forEach(element => revealObserver.observe(element));
}

let interactionsReady = false;
// Card spotlight (no movement, so cards never wobble or zoom) + magnetic buttons use ONE delegated listener each, instead of two listeners per card.
export function activatePremiumInteractions() {
  if (interactionsReady) return;
  interactionsReady = true;
  if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let activeCard = null;
  let rect = null;
  let pending = null;
  let raf = 0;
  const apply = () => {
    raf = 0;
    if (!pending || !activeCard || !rect) return;
    const x = (pending.clientX - rect.left) / rect.width;
    const y = (pending.clientY - rect.top) / rect.height;
    activeCard.style.setProperty('--mx', `${x * 100}%`);
    activeCard.style.setProperty('--my', `${y * 100}%`);
  };
  const release = card => {
    if (!card) return;
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '30%');
  };
  document.addEventListener('pointermove', event => {
    const card = event.target.closest?.('.tool-card');
    if (card !== activeCard) {
      release(activeCard);
      activeCard = card;
      rect = card ? card.getBoundingClientRect() : null;
    }
    const magnet = event.target.closest?.('.magnetic');
    if (magnet) {
      const box = magnet.getBoundingClientRect();
      magnet.style.transform = `translate(${((event.clientX - box.left - box.width / 2) / box.width) * 4}px, ${((event.clientY - box.top - box.height / 2) / box.height) * 4}px)`;
    }
    if (!card) return;
    pending = event;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener('pointerout', event => {
    const magnet = event.target.closest?.('.magnetic');
    if (magnet && !magnet.contains(event.relatedTarget)) magnet.style.transform = '';
    const card = event.target.closest?.('.tool-card');
    if (card && !card.contains(event.relatedTarget)) { release(card); if (card === activeCard) activeCard = null; }
  }, { passive: true });
  document.addEventListener('scroll', () => { rect = null; if (activeCard) rect = activeCard.getBoundingClientRect(); }, { passive: true });
}

// Apple-style horizontal "slides": scroll-snap + arrows + dots + focus scaling.
export function initCarousels(root = document) {
  root.querySelectorAll('[data-carousel]:not([data-carousel-ready])').forEach(carousel => {
    carousel.dataset.carouselReady = 'true';
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = [...track.children];
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const dots = carousel.querySelector('[data-carousel-dots]');
    const bar = carousel.querySelector('[data-carousel-progress]');
    if (dots) dots.innerHTML = slides.map((_, i) => `<button type="button" class="carousel-dot" data-dot="${i}" aria-label="${i + 1} / ${slides.length}"></button>`).join('');
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = track.getBoundingClientRect();
      let best = 0; let bestDistance = Infinity;
      slides.forEach((slide, index) => {
        const r = slide.getBoundingClientRect();
        // Focus = how much of the slide is inside the viewport of the track (edge slides "peek" in, dimmed).
        const visible = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
        slide.style.setProperty('--focus', Math.min(1, visible / r.width).toFixed(3));
        const distance = Math.abs(r.left - box.left);
        if (distance < bestDistance) { bestDistance = distance; best = index; }
      });
      const max = track.scrollWidth - track.clientWidth;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.max(.06, track.scrollLeft / max) : 1})`;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
      dots?.querySelectorAll('.carousel-dot').forEach((dot, i) => dot.classList.toggle('is-active', i === best));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const step = direction => track.scrollBy({ left: direction * Math.max(280, slides[0].getBoundingClientRect().width + 14), behavior: reducedMotion ? 'auto' : 'smooth' });
    prev?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
    dots?.addEventListener('click', event => {
      const dot = event.target.closest('[data-dot]');
      if (dot) slides[Number(dot.dataset.dot)]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    });
    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    // Mouse drag-to-scroll (touch already scrolls natively).
    let down = false; let startX = 0; let startLeft = 0; let moved = false;
    track.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') return; down = true; moved = false; startX = event.clientX; startLeft = track.scrollLeft; });
    window.addEventListener('pointermove', event => {
      if (!down) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 6) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = startLeft - delta;
    }, { passive: true });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; track.classList.remove('is-dragging'); }, { passive: true });
    track.addEventListener('click', event => { if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; } }, true);
    update();
  });
}

export function initGlobalMotion() {
  const header = document.getElementById('site-header');
  const progress = document.getElementById('scroll-progress');
  const root = document.documentElement;
  let scheduled = false;
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    if (progress) progress.style.transform = `scaleX(${scrollable > 0 ? y / scrollable : 0})`;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    // Hero parallax progress (0 → 1 over the first 70% of the viewport). Only a CSS variable changes.
    root.style.setProperty('--hero-p', String(Math.min(1, y / (window.innerHeight * 0.7)).toFixed(3)));
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

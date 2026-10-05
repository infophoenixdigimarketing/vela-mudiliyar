// Scroll + entrance animations for the public site, powered by Motion
// (https://motion.dev — the vanilla-JS sibling of Framer Motion).
//
// Loaded as a PLAIN classic script (no type="module"): this file lives in
// /public and is served as-is. Giving it type="module" makes Vite's dev
// server try to pull it into its dependency-scan/pre-bundling graph, which
// fails (public files aren't source modules) and — critically — that
// failure skips pre-bundling for the *entire* project, including the
// unrelated admin React app. Dynamic import() below works fine from a
// classic script, so no module wrapper is needed on the <script> tag.
//
// If the CDN import fails (offline, blocked network) everything below is
// skipped and the page stays fully readable — nothing is hidden ahead of time.

const EASE = [0.16, 1, 0.3, 1];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Sticky header shrink/shadow state — pure DOM, no animation library needed.
const header = document.querySelector('.site-header');
if (header) {
  const setScrolled = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });
}

if (!reduceMotion) {
  (async () => {
  try {
    const { animate, inView, stagger } = await import('https://cdn.jsdelivr.net/npm/motion@latest/+esm');

    // ---- Hero entrance: headline elements fade/lift in one after another ----
    const heroKids = document.querySelectorAll('.hero-text > *, .page-hero .wrap > *');
    if (heroKids.length) {
      animate(heroKids, { opacity: 0, y: 22 }, { duration: 0 });
      animate(heroKids, { opacity: 1, y: 0 }, { duration: 0.8, delay: stagger(0.09), easing: EASE });
    }

    // ---- Grid / list groups: reveal as a staggered set when scrolled into view ----
    const groupSelectors = [
      '.quick-links', '.services-grid', '.awards-grid', '.people-grid',
      '.people-grid-small', '.stat-row', '.about-facts', '.numbered-report',
      '.gallery-grid', '.contact-list',
    ];
    groupSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((group) => {
        const items = Array.from(group.children);
        if (!items.length) return;
        animate(items, { opacity: 0, y: 22 }, { duration: 0 });
        inView(group, () => {
          animate(items, { opacity: 1, y: 0 }, { duration: 0.6, delay: stagger(0.07), easing: EASE });
        }, { amount: 0.15, margin: '0px 0px -8% 0px' });
      });
    });

    // ---- Standalone blocks: simple fade + rise on scroll ----
    const singleSelectors = [
      '.section-head', '.wisdom-quote', '.secretary-note', '.about-photo',
      '.memory-figure', '.memory-note', '.notice-box', '.map-wrap',
      '.id-card-mock', '.finance-table', '.agenda-block', '.seniors-strip',
      '.donate-qr',
    ];
    singleSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        animate(el, { opacity: 0, y: 20 }, { duration: 0 });
        inView(el, () => {
          animate(el, { opacity: 1, y: 0 }, { duration: 0.65, easing: EASE });
        }, { amount: 0.2, margin: '0px 0px -8% 0px' });
      });
    });

    // ---- Eyebrow labels: the little rule before a kicker draws in ----
    document.querySelectorAll('.kicker').forEach((el) => {
      el.classList.add('kicker-pending');
      inView(el, () => el.classList.add('in-view'), { amount: 0.4 });
    });

    // ---- Numbers count up once, the first time they scroll into view ----
    const countUp = (el) => {
      const raw = el.textContent;
      const match = raw.match(/^(\D*)([\d,]+(?:\.\d+)?)(\D*)$/);
      if (!match) return;
      const [, prefix, numStr, suffix] = match;
      const clean = numStr.replace(/,/g, '');
      const target = parseFloat(clean);
      if (Number.isNaN(target)) return;
      const decimals = (clean.split('.')[1] || '').length;
      const useGrouping = numStr.includes(',');
      const duration = 1100;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = target * eased;
        const body = decimals
          ? value.toFixed(decimals)
          : Math.round(value).toLocaleString(useGrouping ? 'en-IN' : undefined);
        el.textContent = prefix + body + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = raw;
      };
      requestAnimationFrame(tick);
    };
    document.querySelectorAll('.hero-stats dt, .stat-num').forEach((el) => {
      inView(el, () => countUp(el), { amount: 0.6 });
    });

  } catch {
    // Motion failed to load — page remains fully visible with no animation.
  }
  })();
}

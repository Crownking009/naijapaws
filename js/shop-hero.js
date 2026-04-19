/* =============================================
   SHOP HERO JS — shop-hero.js
   Place <script src="shop-hero.js"></script>
   just before </body>
============================================= */

(function () {
  'use strict';

  /* ── Animated counter (0 → 1000) ── */
  function animateCounter() {
    const el = document.getElementById('shpCount');
    if (!el) return;
    const target = 1000;
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(ease * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const counterEl = document.getElementById('shpCounter');
  if (counterEl) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) { animateCounter(); obs.disconnect(); }
      },
      { threshold: 0.5 }
    );
    obs.observe(counterEl);
  }

  /* ── Staggered card entrance ── */
  const cards = document.querySelectorAll('.shp-hero__card');

  const cardObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const idx = Array.from(cards).indexOf(card);
          card.style.animationDelay = `${0.1 + idx * 0.15}s`;
          card.classList.add('shp-card-visible');
          cardObs.unobserve(card);
        }
      });
    },
    { threshold: 0.1 }
  );

  cards.forEach((card) => cardObs.observe(card));

  setTimeout(() => {
    cards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight && !card.classList.contains('shp-card-visible')) {
        card.style.animationDelay = `${0.1 + idx * 0.15}s`;
        card.classList.add('shp-card-visible');
      }
    });
  }, 700);

  /* ── Parallax on hero dog image ── */
  const hero = document.getElementById('shpHero');
  const dogImg = document.querySelector('.shp-hero__dog-img');

  if (hero && dogImg) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const xShift = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
      const yShift = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      dogImg.style.transform = `translate(${xShift}px, ${yShift}px)`;
    });
    hero.addEventListener('mouseleave', () => {
      dogImg.style.transform = 'translate(0, 0)';
    });
  }

  /* ── Button ripple ── */
  const rippleTargets = document.querySelectorAll('.shp-hero__vet-btn, .shp-hero__shop-btn');

  if (!document.getElementById('shpRippleStyle')) {
    const style = document.createElement('style');
    style.id = 'shpRippleStyle';
    style.textContent = `@keyframes shpRipple { to { transform: scale(4); opacity: 0; } }`;
    document.head.appendChild(style);
  }

  rippleTargets.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const circle = document.createElement('span');
      const diameter = Math.max(btn.clientWidth, btn.clientHeight);
      const radius = diameter / 2;
      const rect = btn.getBoundingClientRect();
      circle.style.cssText = `
        position:absolute;width:${diameter}px;height:${diameter}px;
        left:${e.clientX - rect.left - radius}px;top:${e.clientY - rect.top - radius}px;
        background:rgba(255,255,255,0.4);border-radius:50%;
        transform:scale(0);animation:shpRipple 0.55s linear;pointer-events:none;
      `;
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });

})();
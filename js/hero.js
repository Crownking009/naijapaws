/* =============================================
   HERO SECTION JS — hero.js
   Place <script src="hero.js"></script>
   just before </body>
============================================= */

(function () {
  'use strict';

  /* --- Parallax on left panel dog image --- */
  const heroSection = document.getElementById('pupHero');
  const dogImg = heroSection && heroSection.querySelector('.pup-hero__dog-img');

  function onMouseMove(e) {
    if (!dogImg) return;
    const rect = heroSection.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    const xShift = (xRatio - 0.5) * 10;
    const yShift = (yRatio - 0.5) * 10;
    dogImg.style.transform = `scale(1.08) translate(${xShift}px, ${yShift}px)`;
  }

  function onMouseLeave() {
    if (!dogImg) return;
    dogImg.style.transform = 'scale(1.05) translate(0, 0)';
  }

  if (heroSection) {
    heroSection.addEventListener('mousemove', onMouseMove);
    heroSection.addEventListener('mouseleave', onMouseLeave);
  }

  /* --- Staggered card entrance using IntersectionObserver --- */
  const cards = document.querySelectorAll('.pup-hero__card');

  function revealCard(card) {
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }

  const cardObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              revealCard(entry.target);
              cardObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      )
    : null;

  cards.forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    if (cardObserver) {
      cardObserver.observe(card);
    } else {
      revealCard(card);
    }
  });

  /* Trigger cards that are already in view on load */
  setTimeout(() => {
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        revealCard(card);
      }
    });
  }, 800);

  /* --- Button ripple effect --- */
  const btns = document.querySelectorAll('.pup-hero__btn');

  btns.forEach((btn) => {
    btn.addEventListener('click', function (e) {
      const circle = document.createElement('span');
      const diameter = Math.max(btn.clientWidth, btn.clientHeight);
      const radius = diameter / 2;
      const rect = btn.getBoundingClientRect();

      circle.style.cssText = `
        position: absolute;
        width: ${diameter}px;
        height: ${diameter}px;
        left: ${e.clientX - rect.left - radius}px;
        top: ${e.clientY - rect.top - radius}px;
        background: rgba(255,255,255,0.35);
        border-radius: 50%;
        transform: scale(0);
        animation: pupRipple 0.55s linear;
        pointer-events: none;
      `;

      /* Ensure button has position relative for ripple */
      const prevPos = getComputedStyle(btn).position;
      if (prevPos === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';

      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });

  /* Inject ripple keyframe if not already present */
  if (!document.getElementById('pupRippleStyle')) {
    const style = document.createElement('style');
    style.id = 'pupRippleStyle';
    style.textContent = `
      @keyframes pupRipple {
        to { transform: scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  /* --- Pet card tilt effect (desktop only) --- */
  function addTilt(card) {
    card.addEventListener('mousemove', function (e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  }

  if (window.matchMedia('(hover: hover)').matches) {
    cards.forEach(addTilt);
  }

})();

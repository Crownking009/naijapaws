document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('marketplace-filter-form');
  if (!form) return;

  ['category', 'breed', 'state', 'gender', 'sort'].forEach((name) => {
    form.elements[name]?.addEventListener('change', () => form.requestSubmit());
  });


  /* ================================================
   VET CTA BUTTON — JavaScript
   Self-contained IIFE — safe to drop into any project
   Place just before </body> or inside DOMContentLoaded
================================================ */

(function () {
  'use strict';

  const btn   = document.getElementById('vetCallBtn');
  if (!btn) return; // guard: do nothing if button isn't on this page

  const line1 = btn.querySelector('.vet-cta-btn__line1');
  const line2 = btn.querySelector('.vet-cta-btn__line2');
  const icon  = btn.querySelector('.vet-cta-btn__icon');

  const origLine1 = line1.textContent;
  const origLine2 = line2.textContent;

  let resetTimer = null;

  /* ── Ripple ── */
  function spawnRipple(e) {
    const old = btn.querySelector('.vet-ripple');
    if (old) old.remove();

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const x    = (e.clientX ?? rect.left + rect.width  / 2) - rect.left - size / 2;
    const y    = (e.clientY ?? rect.top  + rect.height / 2) - rect.top  - size / 2;

    const dot  = document.createElement('span');
    dot.className = 'vet-ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }

  /* ── Success feedback ── */
  function showSuccess() {
    if (btn.classList.contains('vet--success')) return;

    clearTimeout(resetTimer);
    btn.classList.add('vet--success');
    line1.textContent = 'Great! Connecting you now...';
    line2.textContent = 'Vet consultation starting';
    icon.style.transform = 'scale(1.2) rotate(10deg)';
    icon.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';

    resetTimer = setTimeout(() => {
      btn.classList.remove('vet--success');
      line1.textContent    = origLine1;
      line2.textContent    = origLine2;
      icon.style.transform = '';
    }, 2800);
  }

  /* ── Mouse tilt (desktop only) ── */
  function onMouseMove(e) {
    const rect = btn.getBoundingClientRect();
    const dx   = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
    const dy   = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
    btn.style.transform  = `translateY(-3px) scale(1.03) rotateX(${dy * -5}deg) rotateY(${dx * 5}deg)`;
    btn.style.transition = 'transform 0.08s ease';
  }

  function onMouseLeave() {
    btn.style.transform  = '';
    btn.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
  }

  /* ── Events ── */
  btn.addEventListener('click', (e) => {
    spawnRipple(e);
    showSuccess();
  });

  btn.addEventListener('mousemove',  onMouseMove);
  btn.addEventListener('mouseleave', onMouseLeave);

  // Touch devices — skip tilt, just ripple on touchstart
  btn.addEventListener('touchstart', (e) => {
    spawnRipple(e.touches[0]);
  }, { passive: true });

  // Keyboard (Enter / Space)
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      spawnRipple({ clientX: null, clientY: null });
      showSuccess();
    }
  });

  /* ── Idle wiggle — grabs attention every ~7 s ── */
  function scheduleWiggle() {
    setTimeout(() => {
      if (!btn.classList.contains('vet--success')) {
        btn.animate(
          [
            { transform: 'translateY(0) rotate(0deg)'    },
            { transform: 'translateY(-5px) rotate(-2deg)' },
            { transform: 'translateY(0) rotate(2deg)'    },
            { transform: 'translateY(-2px) rotate(0deg)' },
            { transform: 'translateY(0) rotate(0deg)'    },
          ],
          { duration: 550, easing: 'ease-in-out' }
        );
      }
      scheduleWiggle();
    }, 7000 + Math.random() * 4000);
  }

  btn.style.perspective = '900px';
  scheduleWiggle();

})();
});

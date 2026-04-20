document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('marketplace-filter-form');
  const grid = document.querySelector('.page-marketplace .grid-3');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const getJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      return fallback;
    }
  };

  const categoryBadgeClass = {
    sale: 'badge-sale',
    adoption: 'badge-adoption',
    mating: 'badge-mating',
  };

  if (grid) {
    const sellerDogs = getJson('np_seller_dog_listings', []);
    if (sellerDogs.length) {
      grid.insertAdjacentHTML('beforeend', sellerDogs.map((item) => `
        <article class="listing-card fade-in-up" data-market-card data-category="${escapeHtml(item.category)}" data-breed="${escapeHtml(item.breed)}" data-state="${escapeHtml(item.state)}" data-gender="${escapeHtml(item.gender)}" data-pedigree="${item.isPedigree ? '1' : '0'}" data-search="${escapeHtml(item.search || '')}">
          <div class="card-image-wrap">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">
            <span class="card-badge ${categoryBadgeClass[item.category] || 'badge-sale'}">${escapeHtml(item.categoryLabel || item.category)}</span>
            <span class="card-badge badge-featured" style="left:auto;right:0.75rem;top:0.75rem">Seller</span>
            <button class="card-fav-btn" data-favorite-id="${item.id}" data-favorite-type="dog">&#9825;</button>
          </div>
          <div class="card-body">
            <div class="card-tags">
              <span class="tag">${escapeHtml(item.breed)}</span>
              <span class="tag tag-green">${escapeHtml(item.gender)}</span>
              ${item.isPedigree ? '<span class="tag tag-orange">Pedigree</span>' : ''}
            </div>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <div class="card-meta">
              <span class="card-meta-item">${escapeHtml(item.state)}</span>
              <span class="card-meta-item">${escapeHtml(window.NaijaPaws?.formatAge ? window.NaijaPaws.formatAge(item.ageMonths) : `${item.ageMonths} months`)}</span>
              <span class="card-meta-item">${escapeHtml(item.temperament)}</span>
            </div>
            <div class="card-price ${item.category === 'adoption' ? 'free' : ''}">${item.category === 'adoption' ? 'Free Adoption' : `&#8358;${window.NaijaPaws?.formatMoney ? window.NaijaPaws.formatMoney(item.price) : item.price}`}</div>
            <div class="card-footer">
              <div class="card-seller"><div class="card-seller-avatar">${escapeHtml(item.sellerInitials || 'NP')}</div><div>${escapeHtml(item.seller)}</div></div>
              ${item.category === 'adoption'
                ? '<a href="services.html" class="btn btn-primary btn-sm">Get Advice</a>'
                : `<button class="btn btn-primary btn-sm" data-add-cart data-id="${item.id}" data-type="dog" data-name="${escapeHtml(item.title)}" data-price="${item.price}" data-image="${escapeHtml(item.image)}" data-seller="${escapeHtml(item.seller)}">Add to Cart</button>`}
            </div>
          </div>
        </article>
      `).join(''));
    }
  }

  window.NaijaPaws?.refreshInteractiveContent?.();
  if (form) {
    ['category', 'breed', 'state', 'gender', 'sort'].forEach((name) => {
      form.elements[name]?.addEventListener('change', () => form.requestSubmit());
    });
    form.requestSubmit();
  }


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

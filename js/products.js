document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('product-filter-form');
  const grid = document.querySelector('.page-products .grid-4');

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

  if (grid) {
    const sellerProducts = getJson('np_seller_product_listings', []);
    if (sellerProducts.length) {
      grid.insertAdjacentHTML('beforeend', sellerProducts.map((item) => `
        <article class="product-card fade-in-up" data-product-card data-category="${escapeHtml(item.category)}" data-search="${escapeHtml(item.search || '')}">
          <div class="card-image-wrap">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async">
            ${item.isFeatured ? '<span class="card-badge badge-featured">Featured</span>' : ''}
            ${item.comparePrice > item.price ? `<span class="product-discount">-${Math.max(1, Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100))}%</span>` : ''}
            <button class="card-fav-btn" data-favorite-id="${item.id}" data-favorite-type="product">&#9825;</button>
          </div>
          <div class="card-body">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.3rem">${escapeHtml(item.brand)}</div>
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            <div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.875rem">
              <span style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--forest)">&#8358;${window.NaijaPaws?.formatMoney ? window.NaijaPaws.formatMoney(item.price) : item.price}</span>
              ${item.comparePrice > item.price ? `<span class="compare-price">&#8358;${window.NaijaPaws?.formatMoney ? window.NaijaPaws.formatMoney(item.comparePrice) : item.comparePrice}</span>` : ''}
            </div>
            <p class="text-sm text-muted" style="margin-bottom:0.875rem">${escapeHtml(item.description)}</p>
            <div class="card-footer">
              <div class="card-seller"><div class="card-seller-avatar">${escapeHtml(item.sellerInitials || 'NP')}</div><div>${escapeHtml(item.seller)}</div></div>
              <button class="btn btn-primary btn-sm" data-add-cart data-id="${item.id}" data-type="product" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-image="${escapeHtml(item.image)}" data-seller="${escapeHtml(item.seller)}">Add to Cart</button>
            </div>
          </div>
        </article>
      `).join(''));
    }
  }

  window.NaijaPaws?.refreshInteractiveContent?.();
  if (form) {
    ['category', 'sort'].forEach((name) => {
      form.elements[name]?.addEventListener('change', () => form.requestSubmit());
    });
    form.requestSubmit();
  }
});

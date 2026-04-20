'use strict';

(function () {
  const DATA = window.NaijaPawsData || {};
  const STORAGE = {
    users: 'np_registered_users',
    user: 'np_session_user',
    removedUsers: 'np_removed_users',
    cart: 'np_cart',
    favorites: 'np_favorites',
    vetRequests: 'np_vet_requests',
    sellerApps: 'np_seller_applications',
    sellerDogs: 'np_seller_dog_listings',
    sellerProducts: 'np_seller_product_listings',
  };

  const state = {
    user: null,
    cart: [],
  };

  const SELLER_PRODUCT_MIN_IMAGES = 2;
  const SELLER_PRODUCT_MAX_IMAGES = 6;
  const SELLER_IMAGE_MAX_DIMENSION = 1280;
  const SELLER_IMAGE_QUALITY = 0.82;

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function resolveUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function navigateTo(path) {
    window.location.href = resolveUrl(path);
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat('en-NG').format(Math.round(Number(amount) || 0));
  }

  function formatAge(months) {
    const value = Number(months) || 0;
    if (value < 1) return 'Newborn';
    if (value < 12) return `${value} month${value > 1 ? 's' : ''}`;
    const years = Math.floor(value / 12);
    const remainder = value % 12;
    return `${years}yr${years > 1 ? 's' : ''}${remainder ? ` ${remainder}mo` : ''}`;
  }

  function initialsFromName(value) {
    return String(value || 'NP')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'NP';
  }

  function getDestinationForUser(user) {
    if (!user) return 'login.html';
    if (user.role === 'admin') return 'admin/index.html';
    if (user.role === 'seller') return 'seller-portal.html';
    return 'dashboard.html';
  }

  function updateStoredUser(partial) {
    if (!state.user) return null;

    const nextUser = { ...state.user, ...partial };
    const users = currentUsers().map((user) => (
      user.email === state.user.email ? { ...user, ...partial } : user
    ));

    setJson(STORAGE.users, users);
    saveSession(nextUser);
    return nextUser;
  }

  function currentUsers() {
    const removedEmails = new Set(getRemovedUsers());
    const savedUsers = getJson(STORAGE.users, []).filter((user) => !removedEmails.has(user.email));
    const existingEmails = new Set(savedUsers.map((user) => user.email));
    const merged = [...savedUsers];
    (DATA.demoUsers || []).forEach((user) => {
      if (!existingEmails.has(user.email) && !removedEmails.has(user.email)) {
        merged.push(user);
      }
    });
    setJson(STORAGE.users, merged);
    return merged;
  }

  function getFavorites() {
    return getJson(STORAGE.favorites, []);
  }

  function setFavorites(favorites) {
    setJson(STORAGE.favorites, favorites);
  }

  function getRemovedUsers() {
    return getJson(STORAGE.removedUsers, []);
  }

  function removeRemovedEmail(email) {
    if (!email) return;
    const nextRemoved = getRemovedUsers().filter((entry) => entry !== email);
    setJson(STORAGE.removedUsers, nextRemoved);
  }

  function getStoredUsers() {
    return getJson(STORAGE.users, []);
  }

  function getSellerApplication(email) {
    if (!email) return null;
    return getJson(STORAGE.sellerApps, []).find((entry) => entry.email === email) || null;
  }

  function getSellerVerificationStatus(email) {
    if (!email) return 'unverified';

    const application = getSellerApplication(email);
    const normalizedStatus = String(application?.status || '').toLowerCase();
    if (normalizedStatus === 'verified' || normalizedStatus === 'approved') {
      return 'verified';
    }
    if (normalizedStatus === 'pending' || normalizedStatus === 'rejected') {
      return normalizedStatus;
    }

    const storedUser = getStoredUsers().find((user) => user.email === email);
    if (storedUser?.role === 'seller' && storedUser.approved) {
      return 'verified';
    }

    return 'unverified';
  }

  function isUserBlocked(email) {
    if (!email) return false;
    return Boolean(getStoredUsers().find((user) => user.email === email)?.blocked);
  }

  function syncSellerVerificationStatus(email, status) {
    if (!email) return;

    const normalizedStatus = status === 'verified' ? 'verified' : 'pending';
    const apps = getJson(STORAGE.sellerApps, []).map((entry) => (
      entry.email === email
        ? {
            ...entry,
            status: normalizedStatus,
            verifiedAt: normalizedStatus === 'verified' ? new Date().toISOString() : entry.verifiedAt || '',
          }
        : entry
    ));
    setJson(STORAGE.sellerApps, apps);

    const users = currentUsers().map((user) => (
      user.email === email
        ? { ...user, approved: normalizedStatus === 'verified' }
        : user
    ));
    setJson(STORAGE.users, users);

    const products = getJson(STORAGE.sellerProducts, []).map((item) => (
      item.sellerEmail === email
        ? {
            ...item,
            sellerVerified: normalizedStatus === 'verified',
            sellerVerificationStatus: normalizedStatus,
          }
        : item
    ));
    setJson(STORAGE.sellerProducts, products);
  }

  function setUserBlockedState(email, blocked) {
    if (!email) return;

    const users = currentUsers().map((user) => (
      user.email === email
        ? { ...user, blocked: Boolean(blocked) }
        : user
    ));
    setJson(STORAGE.users, users);

    if (state.user?.email === email && blocked) {
      saveSession(null);
    }
  }

  function removeAccountByEmail(email) {
    if (!email) return;

    const removed = Array.from(new Set([...getRemovedUsers(), email]));
    setJson(STORAGE.removedUsers, removed);
    setJson(STORAGE.users, getStoredUsers().filter((user) => user.email !== email));
    setJson(STORAGE.sellerApps, getJson(STORAGE.sellerApps, []).filter((entry) => entry.email !== email));
    setJson(STORAGE.sellerDogs, getJson(STORAGE.sellerDogs, []).filter((item) => item.sellerEmail !== email));
    setJson(STORAGE.sellerProducts, getJson(STORAGE.sellerProducts, []).filter((item) => item.sellerEmail !== email));
    setJson(STORAGE.vetRequests, getJson(STORAGE.vetRequests, []).filter((entry) => entry.email !== email));

    if (state.user?.email === email) {
      saveSession(null);
    }
  }

  function getProductImageArray(item) {
    if (Array.isArray(item?.images) && item.images.length) {
      return item.images.filter(Boolean);
    }
    return item?.image ? [item.image] : [];
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Could not read ${file?.name || 'image file'}.`));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not load selected image.'));
      image.src = source;
    });
  }

  async function compressImageFile(file) {
    if (!file || !String(file.type || '').startsWith('image/')) {
      throw new Error('Only image files can be uploaded.');
    }

    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    const width = image.naturalWidth || image.width || 1;
    const height = image.naturalHeight || image.height || 1;
    const scale = Math.min(1, SELLER_IMAGE_MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return source;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let output = canvas.toDataURL('image/webp', SELLER_IMAGE_QUALITY);
    if (!output.startsWith('data:image/webp')) {
      output = canvas.toDataURL('image/jpeg', SELLER_IMAGE_QUALITY);
    }

    return output;
  }

  async function prepareProductImages(files) {
    const images = await Promise.all(Array.from(files || []).map((file) => compressImageFile(file)));
    return images.filter(Boolean);
  }

  function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('leaving');
      window.setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function requireUser(redirect = 'login.html') {
    if (state.user) return true;
    showToast('Please sign in first.', 'warning');
    window.setTimeout(() => navigateTo(redirect), 450);
    return false;
  }

  function saveSession(user) {
    if (user) {
      setJson(STORAGE.user, user);
      state.user = user;
      return;
    }
    localStorage.removeItem(STORAGE.user);
    state.user = null;
  }

  function syncNavState() {
    const guestBlocks = document.querySelectorAll('[data-auth-guest]');
    const userBlocks = document.querySelectorAll('[data-auth-user]');
    const adminOnly = document.querySelectorAll('[data-auth-admin]');
    const userLinks = document.querySelectorAll('[data-user-link]');
    const userLabels = document.querySelectorAll('[data-user-label]');

    guestBlocks.forEach((element) => {
      element.style.display = state.user ? 'none' : '';
    });

    userBlocks.forEach((element) => {
      element.style.display = state.user ? '' : 'none';
    });

    adminOnly.forEach((element) => {
      element.style.display = state.user?.role === 'admin' ? '' : 'none';
    });

    userLinks.forEach((element) => {
      if (!state.user) return;
      if (state.user.role === 'admin') {
        element.setAttribute('href', 'admin/index.html');
        element.textContent = 'Admin';
        return;
      }
      if (state.user.role === 'seller') {
        element.setAttribute('href', 'seller-portal.html');
        element.textContent = 'Seller Hub';
        return;
      }
      element.setAttribute('href', 'dashboard.html');
      element.textContent = 'Dashboard';
    });

    userLabels.forEach((element) => {
      element.textContent = state.user ? state.user.fullName : '';
    });
  }

  function syncActiveNav() {
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    document.querySelectorAll('.nav-links a, .nav-mobile-links a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (currentPath.endsWith(`/${href}`) || currentPath.endsWith(href)) {
        link.classList.add('active');
      }
    });
  }

  function ensureMobileAuthLinks() {
    document.querySelectorAll('.nav-mobile-links').forEach((mobileLinks) => {
      if (mobileLinks.querySelector('[data-auth-guest], [data-auth-user]')) return;

      const guestBlock = document.createElement('div');
      guestBlock.setAttribute('data-auth-guest', '');
      guestBlock.innerHTML = `
        <a href="login.html" class="nav-mobile-auth-link">Login</a>
        <a href="register.html" class="nav-mobile-auth-link nav-mobile-auth-link-primary">Sign Up</a>
      `;

      const userBlock = document.createElement('div');
      userBlock.setAttribute('data-auth-user', '');
      userBlock.style.display = 'none';
      userBlock.innerHTML = `
        <a href="dashboard.html" class="nav-mobile-auth-link" data-user-link>Dashboard</a>
        <a href="index.html" class="nav-mobile-auth-link" data-logout>Log Out</a>
      `;

      mobileLinks.append(guestBlock, userBlock);
    });
  }

  function initNavigation() {
    const mobileToggle = document.querySelector('.nav-mobile-toggle');
    const mobileNav = document.querySelector('.nav-mobile');
    const mobileClose = document.querySelector('.nav-mobile-close');
    const navbar = document.querySelector('.navbar');

    ensureMobileAuthLinks();
    syncNavState();
    syncActiveNav();

    const closeMobileNav = () => {
      mobileNav?.classList.remove('open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    };

    const openMobileNav = () => {
      mobileNav?.classList.add('open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'true');
      }
      document.body.style.overflow = 'hidden';
    };

    window.addEventListener('scroll', () => {
      navbar?.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });

    mobileToggle?.addEventListener('click', () => {
      openMobileNav();
    });

    mobileClose?.addEventListener('click', () => {
      closeMobileNav();
    });

    mobileNav?.addEventListener('click', (event) => {
      if (event.target === mobileNav) {
        closeMobileNav();
      }
    });

    mobileNav?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileNav();
      });
    });
  }

  function updateCartBadge() {
    const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-badge').forEach((badge) => {
      badge.textContent = total ? String(total) : '';
      badge.style.display = total ? 'flex' : 'none';
    });
  }

  function renderCart() {
    const body = document.querySelector('.cart-body');
    const footer = document.querySelector('.cart-footer');
    if (!body || !footer) return;

    if (!state.cart.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">Cart</div>
          <div class="empty-title">Your cart is empty</div>
          <div class="empty-desc">Add dogs or products from any page to start checkout.</div>
          <a href="marketplace.html" class="btn btn-primary">Browse Listings</a>
        </div>
      `;
      footer.style.display = 'none';
      return;
    }

    let total = 0;
    body.innerHTML = `
      <div class="fraud-warning-cart">
        Safety reminder: keep payments routed through NaijaPaws-admin-managed coordination.
      </div>
      ${state.cart.map((item, index) => {
        total += item.price * item.qty;
        return `
          <div class="cart-item">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-item-img">
            <div class="cart-item-info">
              <div class="cart-item-name">${escapeHtml(item.name)}</div>
              <div class="cart-item-seller">By ${escapeHtml(item.seller)}</div>
              <div class="cart-item-price">&#8358;${formatMoney(item.price)}</div>
              <div class="cart-qty-btns">
                <button type="button" class="qty-btn" data-cart-delta="-1" data-cart-index="${index}">-</button>
                <span style="font-weight:600;min-width:20px;text-align:center">${item.qty}</span>
                <button type="button" class="qty-btn" data-cart-delta="1" data-cart-index="${index}">+</button>
                <button type="button" class="qty-btn" data-cart-remove="${index}" style="margin-left:auto;color:var(--danger)">x</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    `;

    footer.style.display = 'block';
    footer.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem">
        <span class="text-sm text-muted">Subtotal</span>
        <strong>&#8358;${formatMoney(total)}</strong>
      </div>
      <label class="checkbox-group" style="margin-bottom:1rem;background:rgba(124,45,18,0.05)">
        <input type="checkbox" id="cart-safety-check">
        <label>I understand I should not pay sellers directly.</label>
      </label>
      <button type="button" class="btn btn-whatsapp btn-block btn-lg" id="checkout-button">Checkout Via WhatsApp</button>
    `;

    body.querySelectorAll('[data-cart-delta]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.cartIndex);
        const delta = Number(button.dataset.cartDelta);
        state.cart[index].qty = Math.max(1, state.cart[index].qty + delta);
        setJson(STORAGE.cart, state.cart);
        renderCart();
        updateCartBadge();
      });
    });

    body.querySelectorAll('[data-cart-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.cartRemove);
        state.cart.splice(index, 1);
        setJson(STORAGE.cart, state.cart);
        renderCart();
        updateCartBadge();
        showToast('Item removed from cart.', 'info');
      });
    });

    document.getElementById('checkout-button')?.addEventListener('click', () => {
      const agreed = document.getElementById('cart-safety-check')?.checked;
      if (!agreed) {
        showToast('Please confirm the safety reminder first.', 'warning');
        return;
      }

      const totalMessage = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const message = encodeURIComponent([
        'NaijaPaws checkout request',
        ...state.cart.map((item) => `${item.qty}x ${item.name} - NGN ${formatMoney(item.qty * item.price)}`),
        `Total: NGN ${formatMoney(totalMessage)}`,
      ].join('\n'));

      window.open(`https://wa.me/${DATA.admin?.whatsapp || ''}?text=${message}`, '_blank');
      state.cart = [];
      setJson(STORAGE.cart, state.cart);
      renderCart();
      updateCartBadge();
      closeCart();
      showToast('WhatsApp checkout opened.', 'success');
    });
  }

  function openCart() {
    document.querySelector('.cart-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
  }

  function closeCart() {
    document.querySelector('.cart-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function initCart() {
    document.querySelectorAll('[data-open-cart]').forEach((button) => {
      button.addEventListener('click', openCart);
    });

    document.querySelector('.cart-close')?.addEventListener('click', closeCart);
    document.querySelector('.cart-overlay')?.addEventListener('click', (event) => {
      if (event.target.classList.contains('cart-overlay')) {
        closeCart();
      }
    });

    updateCartBadge();
  }

  function addToCartFromButton(button) {
    if (!requireUser()) return;

    const item = {
      id: Number(button.dataset.id),
      type: button.dataset.type || 'item',
      name: button.dataset.name || 'Item',
      price: Number(button.dataset.price || 0),
      image: button.dataset.image || '',
      seller: button.dataset.seller || 'NaijaPaws',
      qty: 1,
    };

    const existing = state.cart.find((entry) => entry.id === item.id && entry.type === item.type);
    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push(item);
    }

    setJson(STORAGE.cart, state.cart);
    updateCartBadge();
    showToast(`${item.name} added to cart.`, 'success');
  }

  function initAddToCartButtons() {
    document.querySelectorAll('[data-add-cart]').forEach((button) => {
      if (button.dataset.cartBound === '1') return;
      button.dataset.cartBound = '1';
      button.addEventListener('click', () => addToCartFromButton(button));
    });
  }

  function initFavorites() {
    const favorites = getFavorites();
    document.querySelectorAll('[data-favorite-id]').forEach((button) => {
      const id = Number(button.dataset.favoriteId);
      const type = button.dataset.favoriteType || 'item';
      const exists = favorites.some((entry) => entry.id === id && entry.type === type);
      button.classList.toggle('active', exists);
      button.innerHTML = exists ? '&#10084;' : '&#9825;';

      if (button.dataset.favoriteBound === '1') return;
      button.dataset.favoriteBound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (!requireUser()) return;

        const nextFavorites = getFavorites();
        const index = nextFavorites.findIndex((entry) => entry.id === id && entry.type === type);
        if (index >= 0) {
          nextFavorites.splice(index, 1);
          button.classList.remove('active');
          button.innerHTML = '&#9825;';
          showToast('Removed from favorites.', 'info');
        } else {
          nextFavorites.push({ id, type });
          button.classList.add('active');
          button.innerHTML = '&#10084;';
          showToast('Added to favorites.', 'success');
        }
        setFavorites(nextFavorites);
      });
    });
  }

  function initHeroSlider() {
    const slides = document.querySelector('.hero-slides');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides || !dots.length) return;

    let current = 0;
    const update = (index) => {
      current = (index + dots.length) % dots.length;
      slides.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === current));
    };

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => update(index));
    });

    window.setInterval(() => update(current + 1), 5000);
  }

  function initGallery() {
    const mainImage = document.getElementById('dog-main-image');
    if (!mainImage) return;

    document.querySelectorAll('[data-gallery-image]').forEach((button) => {
      button.addEventListener('click', () => {
        mainImage.src = button.dataset.galleryImage || mainImage.src;
        document.querySelectorAll('[data-gallery-image]').forEach((thumb) => {
          thumb.style.borderColor = 'transparent';
        });
        button.style.borderColor = 'var(--forest)';
      });
    });
  }

  function initHeroSearch() {
    const form = document.getElementById('hero-search-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const search = encodeURIComponent(values.search || '');
      if (values.type === 'products') {
        navigateTo(`products.html?search=${search}`);
        return;
      }
      const category = values.type === 'dogs' ? 'sale' : (values.type || 'sale');
      navigateTo(`marketplace.html?category=${category}&search=${search}`);
    });
  }

  function applyMarketplaceFilters() {
    const form = document.getElementById('marketplace-filter-form');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    ['category', 'search', 'breed', 'state', 'gender', 'sort'].forEach((name) => {
      const field = form.elements[name];
      if (field && params.get(name)) {
        field.value = params.get(name);
      }
    });
    if (form.elements.pedigree && params.get('pedigree') === '1') {
      form.elements.pedigree.checked = true;
    }

    const cards = Array.from(document.querySelectorAll('[data-market-card]'));
    let visible = 0;
    cards.forEach((card) => {
      const matchesCategory = !form.elements.category.value || card.dataset.category === form.elements.category.value;
      const matchesBreed = !form.elements.breed.value || card.dataset.breed === form.elements.breed.value;
      const matchesState = !form.elements.state.value || card.dataset.state === form.elements.state.value;
      const matchesGender = !form.elements.gender.value || card.dataset.gender === form.elements.gender.value;
      const matchesPedigree = !form.elements.pedigree.checked || card.dataset.pedigree === '1';
      const query = String(form.elements.search.value || '').trim().toLowerCase();
      const matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);

      const show = matchesCategory && matchesBreed && matchesState && matchesGender && matchesPedigree && matchesSearch;
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    const count = document.getElementById('marketplace-results-count');
    if (count) {
      count.textContent = String(visible);
    }
  }

  function initMarketplaceFilters() {
    const form = document.getElementById('marketplace-filter-form');
    if (!form) return;

    applyMarketplaceFilters();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const params = new URLSearchParams(new FormData(form));
      if (!form.elements.pedigree.checked) params.delete('pedigree');
      history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      applyMarketplaceFilters();
    });
  }

  function applyProductFilters() {
    const form = document.getElementById('product-filter-form');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    ['category', 'search', 'sort'].forEach((name) => {
      const field = form.elements[name];
      if (field && params.get(name)) {
        field.value = params.get(name);
      }
    });

    const cards = Array.from(document.querySelectorAll('[data-product-card]'));
    let visible = 0;
    cards.forEach((card) => {
      const matchesCategory = !form.elements.category.value || form.elements.category.value === 'all' || card.dataset.category === form.elements.category.value;
      const query = String(form.elements.search.value || '').trim().toLowerCase();
      const matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);
      const show = matchesCategory && matchesSearch;
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    const count = document.getElementById('product-results-count');
    if (count) {
      count.textContent = String(visible);
    }
  }

  function initProductFilters() {
    const form = document.getElementById('product-filter-form');
    if (!form) return;

    applyProductFilters();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const params = new URLSearchParams(new FormData(form));
      history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      applyProductFilters();
    });
  }

  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    if (state.user) {
      navigateTo(getDestinationForUser(state.user));
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const user = currentUsers().find((entry) => (
        entry.email.toLowerCase() === String(values.email || '').toLowerCase() &&
        entry.password === values.password
      ));

      if (!user) {
        showToast('Incorrect email or password.', 'error');
        return;
      }

      if (user.blocked) {
        showToast('This account has been blocked by admin.', 'error');
        return;
      }

      saveSession({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        approved: Boolean(user.approved),
        blocked: Boolean(user.blocked),
      });

      showToast('Signed in successfully.', 'success');
      window.setTimeout(() => {
        navigateTo(getDestinationForUser(state.user));
      }, 400);
    });
  }

  function initRegisterForm() {
    const forms = Array.from(document.querySelectorAll('[data-register-form]'));
    if (!forms.length) return;

    const tabs = Array.from(document.querySelectorAll('[data-register-tab-target]'));
    const panels = Array.from(document.querySelectorAll('[data-register-panel]'));

    const setRegisterMode = (mode) => {
      tabs.forEach((button) => {
        const active = button.dataset.registerTabTarget === mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.registerPanel === mode);
      });

      if (window.location.hash !== `#${mode}`) {
        history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${mode}`);
      }
    };

    const initialMode = window.location.hash === '#seller' ? 'seller' : 'buyer';
    setRegisterMode(initialMode);

    tabs.forEach((button) => {
      button.addEventListener('click', () => {
        setRegisterMode(button.dataset.registerTabTarget || 'buyer');
      });
    });

    window.addEventListener('hashchange', () => {
      setRegisterMode(window.location.hash === '#seller' ? 'seller' : 'buyer');
    });

    forms.forEach((form) => {
      if (form.dataset.registerBound === '1') return;
      form.dataset.registerBound = '1';

      form.addEventListener('submit', (event) => {
        event.preventDefault();

        const role = form.dataset.registerRole || 'buyer';
        const values = Object.fromEntries(new FormData(form).entries());
        if (!values.full_name || !values.email || !values.phone || !values.password || !values.state) {
          showToast('Please complete all required fields.', 'warning');
          return;
        }
        if (values.password.length < 8) {
          showToast('Password must be at least 8 characters.', 'warning');
          return;
        }
        if (values.password !== values.password2) {
          showToast('Passwords do not match.', 'warning');
          return;
        }
        if (!values.agree_terms) {
          showToast('Please accept the terms first.', 'warning');
          return;
        }

        if (
          role === 'seller' &&
          (!values.store_name || !values.seller_specialty || !values.business_city || !values.business_address)
        ) {
          showToast('Please complete all seller business details.', 'warning');
          return;
        }

        const users = currentUsers();
        if (users.some((user) => user.email.toLowerCase() === String(values.email).toLowerCase())) {
          showToast('That email is already registered.', 'error');
          return;
        }

        const newUser = {
          id: Date.now(),
          fullName: values.full_name,
          email: values.email.toLowerCase(),
          phone: values.phone,
          password: values.password,
          role,
          state: values.state,
          approved: role === 'seller' ? false : true,
          storeName: role === 'seller' ? values.store_name : '',
          sellerSpecialty: role === 'seller' ? values.seller_specialty : '',
          businessCity: role === 'seller' ? values.business_city : '',
          businessAddress: role === 'seller' ? values.business_address : '',
        };

        users.push(newUser);
        removeRemovedEmail(newUser.email);
        setJson(STORAGE.users, users);
        saveSession({
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          approved: Boolean(newUser.approved),
          blocked: Boolean(newUser.blocked),
          storeName: newUser.storeName,
        });

        showToast(
          newUser.role === 'seller'
            ? 'Seller account created. Complete verification to earn the verified seller badge.'
            : 'Buyer account created successfully.',
          'success'
        );
        window.setTimeout(() => navigateTo(getDestinationForUser(state.user)), 500);
      });
    });
  }

  function initVetForm() {
    const form = document.getElementById('vet-request-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      if (!values.full_name || !values.phone || !values.state || !values.dog_issue || values.dog_issue.length < 15) {
        showToast('Please fill the form with enough detail.', 'warning');
        return;
      }

      const requests = getJson(STORAGE.vetRequests, []);
      requests.push({
        ...values,
        email: state.user?.email || '',
        createdAt: new Date().toISOString(),
      });
      setJson(STORAGE.vetRequests, requests);

      const message = encodeURIComponent(
        `Vet request from ${values.full_name}\nState: ${values.state}\nUrgency: ${values.urgency}\nIssue: ${values.dog_issue}`
      );
      form.reset();
      showToast('Request saved. Opening WhatsApp.', 'success');
      window.setTimeout(() => {
        window.open(`https://wa.me/${DATA.admin?.whatsapp || ''}?text=${message}`, '_blank');
        window.location.reload();
      }, 500);
    });
  }

  function initSellerForm() {
    const form = document.getElementById('seller-form');
    if (!form) return;

    const gate = document.getElementById('seller-login-gate');
    const content = document.getElementById('seller-form-content');
    if (!state.user) {
      if (gate) gate.style.display = '';
      if (content) content.style.display = 'none';
      return;
    }

    if (gate) gate.style.display = 'none';
    if (content) content.style.display = '';

    const existing = getJson(STORAGE.sellerApps, []).find((entry) => entry.email === state.user.email);
    if (existing) {
      const statusBox = document.getElementById('seller-existing-status');
      if (statusBox) {
        const isVerified = getSellerVerificationStatus(state.user.email) === 'verified';
        const accentColor = isVerified ? 'var(--success)' : 'var(--warning)';
        const accentBg = isVerified ? 'var(--success-bg)' : 'var(--warning-bg)';
        const borderColor = isVerified ? 'rgba(22,101,52,0.2)' : 'rgba(180,83,9,0.2)';
        statusBox.style.display = '';
        statusBox.innerHTML = `
          <div class="verification-card" style="background:${accentBg};border-color:${borderColor}">
            <h3 style="font-family:var(--font-display);margin-bottom:0.5rem;color:${accentColor}">Application already saved</h3>
            <p class="text-sm" style="color:${accentColor}">Current status: ${escapeHtml(getSellerVerificationStatus(state.user.email))}</p>
          </div>
        `;
      }
      form.style.display = 'none';
      return;
    }

    const fullName = form.elements.full_name;
    const phone = form.elements.phone;
    if (fullName && !fullName.value) fullName.value = state.user.fullName;
    if (phone && !phone.value) phone.value = state.user.phone || '';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      if (!values.full_name || !values.phone || !values.address || !values.state || !values.id_type || !values.nin_number || !values.commission_agree) {
        showToast('Please complete the seller application form.', 'warning');
        return;
      }

      const apps = getJson(STORAGE.sellerApps, []);
      apps.push({
        ...values,
        email: state.user.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setJson(STORAGE.sellerApps, apps);
      updateStoredUser({
        role: 'seller',
        approved: false,
        storeName: values.full_name,
      });
      showToast('Seller application submitted. Await admin verification.', 'success');
      window.setTimeout(() => navigateTo('seller-portal.html'), 500);
    });
  }

  function initSellerPortal() {
    const page = document.getElementById('seller-portal-page');
    if (!page) return;

    const gate = document.getElementById('seller-portal-gate');
    const content = document.getElementById('seller-portal-content');
    const upgrade = document.getElementById('seller-portal-upgrade');

    if (!state.user) {
      if (gate) gate.style.display = '';
      if (content) content.style.display = 'none';
      if (upgrade) upgrade.style.display = 'none';
      return;
    }

    if (state.user.role !== 'seller') {
      if (gate) gate.style.display = 'none';
      if (content) content.style.display = 'none';
      if (upgrade) upgrade.style.display = '';
      return;
    }

    if (gate) gate.style.display = 'none';
    if (content) content.style.display = '';
    if (upgrade) upgrade.style.display = 'none';

    const dogForm = document.getElementById('seller-dog-form');
    const productForm = document.getElementById('seller-product-form');
    const dogList = document.getElementById('seller-dog-list');
    const productList = document.getElementById('seller-product-list');
    const productImageInput = document.getElementById('seller-product-images');
    const productImagePreview = document.getElementById('seller-product-image-preview');
    let productPreviewUrls = [];

    const clearProductPreviewUrls = () => {
      productPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      productPreviewUrls = [];
    };

    const renderProductImagePreview = (files) => {
      if (!productImagePreview) return;

      clearProductPreviewUrls();

      const selectedFiles = Array.from(files || []);
      if (!selectedFiles.length) {
        productImagePreview.classList.add('is-empty');
        productImagePreview.innerHTML = `
          <div class="seller-upload-preview-empty">
            No product images selected yet. Add at least ${SELLER_PRODUCT_MIN_IMAGES} clear photos.
          </div>
        `;
        return;
      }

      productPreviewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
      productImagePreview.classList.remove('is-empty');
      productImagePreview.innerHTML = productPreviewUrls.map((url, index) => `
        <div class="seller-upload-preview-card">
          <img src="${url}" alt="Selected product image ${index + 1}">
          <span class="seller-upload-preview-badge">${index === 0 ? 'Cover' : `Image ${index + 1}`}</span>
        </div>
      `).join('');

      productImagePreview.querySelectorAll('img').forEach((image, index) => {
        image.addEventListener('load', () => {
          const url = productPreviewUrls[index];
          if (url) URL.revokeObjectURL(url);
        }, { once: true });
      });
    };

    const renderPortal = () => {
      const dogs = getJson(STORAGE.sellerDogs, []).filter((item) => item.sellerEmail === state.user.email);
      const products = getJson(STORAGE.sellerProducts, []).filter((item) => item.sellerEmail === state.user.email);

      const summaryMap = {
        'seller-store-name': state.user.storeName || state.user.fullName,
        'seller-dog-count': String(dogs.length),
        'seller-product-count': String(products.length),
        'seller-live-count': String(dogs.length + products.length),
      };

      Object.entries(summaryMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      });

      if (dogList) {
        dogList.innerHTML = dogs.length ? dogs.map((item) => `
          <div class="verification-step">
            <div class="step-num">${escapeHtml(initialsFromName(item.breed))}</div>
            <div style="flex:1;min-width:0">
              <div class="font-semibold">${escapeHtml(item.title)}</div>
              <div class="text-sm text-muted">${escapeHtml(item.categoryLabel)} • ${escapeHtml(item.state)} • ${escapeHtml(formatAge(item.ageMonths))}</div>
              <div class="text-sm text-muted">NGN ${formatMoney(item.price)}</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" data-delete-seller-item="dog" data-delete-id="${item.id}">Delete</button>
          </div>
        `).join('') : '<p class="text-sm text-muted">No dog listings yet. Use the form above to publish your first listing.</p>';
      }

      if (productList) {
        productList.innerHTML = products.length ? products.map((item) => `
          <div class="verification-step">
            <div class="step-num">${escapeHtml(initialsFromName(item.brand || item.name))}</div>
            <div style="flex:1;min-width:0">
              <div class="font-semibold">${escapeHtml(item.name)}</div>
              <div class="text-sm text-muted">${escapeHtml(item.categoryLabel)} • Stock ${escapeHtml(item.stock)} • ${getProductImageArray(item).length} image${getProductImageArray(item).length === 1 ? '' : 's'}</div>
              <div class="text-sm text-muted">NGN ${formatMoney(item.price)}</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" data-delete-seller-item="product" data-delete-id="${item.id}">Delete</button>
          </div>
        `).join('') : '<p class="text-sm text-muted">No product listings yet. Add accessories, food, or supplies with the form above.</p>';
      }

      page.querySelectorAll('[data-delete-seller-item]').forEach((button) => {
        if (button.dataset.deleteBound === '1') return;
        button.dataset.deleteBound = '1';
        button.addEventListener('click', () => {
          const type = button.dataset.deleteSellerItem;
          const id = Number(button.dataset.deleteId);
          const key = type === 'dog' ? STORAGE.sellerDogs : STORAGE.sellerProducts;
          const items = getJson(key, []).filter((item) => Number(item.id) !== id);
          setJson(key, items);
          renderPortal();
          showToast('Listing removed from seller hub.', 'info');
        });
      });
    };

    if (productImageInput && productImageInput.dataset.bound !== '1') {
      productImageInput.dataset.bound = '1';
      renderProductImagePreview(productImageInput.files);
      productImageInput.addEventListener('change', () => {
        renderProductImagePreview(productImageInput.files);
      });
    }

    if (dogForm && dogForm.dataset.bound !== '1') {
      dogForm.dataset.bound = '1';
      dogForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(dogForm).entries());
        if (
          !values.title || !values.category || !values.breed || !values.gender ||
          !values.age_months || !values.state || !values.city || !values.temperament ||
          !values.health_status || !values.image || !values.description
        ) {
          showToast('Please complete all dog listing fields.', 'warning');
          return;
        }

        if (values.category !== 'adoption' && (!values.price || Number(values.price) <= 0)) {
          showToast('Please enter a valid dog listing price.', 'warning');
          return;
        }

        const dogs = getJson(STORAGE.sellerDogs, []);
        dogs.unshift({
          id: Date.now(),
          sellerEmail: state.user.email,
          seller: state.user.storeName || state.user.fullName,
          sellerInitials: initialsFromName(state.user.storeName || state.user.fullName),
          title: values.title,
          category: values.category,
          categoryLabel: values.category === 'sale' ? 'Dogs for Sale' : values.category === 'mating' ? 'Mating' : 'Adoption',
          breed: values.breed,
          gender: values.gender,
          ageMonths: Number(values.age_months),
          state: values.state,
          city: values.city,
          price: values.category === 'adoption' ? 0 : Number(values.price),
          temperament: values.temperament,
          healthStatus: values.health_status,
          isVaccinated: values.is_vaccinated === 'yes',
          isPedigree: values.is_pedigree === 'yes',
          description: values.description,
          image: values.image,
          search: [
            values.title,
            values.breed,
            values.state,
            state.user.storeName || state.user.fullName,
          ].join(' ').toLowerCase(),
          createdAt: new Date().toISOString(),
        });
        setJson(STORAGE.sellerDogs, dogs);
        dogForm.reset();
        renderPortal();
        showToast('Dog listing published to your seller hub.', 'success');
      });
    }

    if (productForm && productForm.dataset.bound !== '1') {
      productForm.dataset.bound = '1';
      productForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(productForm).entries());
        const imageFiles = Array.from(productImageInput?.files || []);
        const submitButton = productForm.querySelector('button[type="submit"]');
        if (
          !values.name || !values.category || !values.brand ||
          !values.stock || !values.price || !values.description
        ) {
          showToast('Please complete all product listing fields.', 'warning');
          return;
        }

        if (Number(values.price) <= 0 || Number(values.stock) < 0) {
          showToast('Enter a valid product price and stock quantity.', 'warning');
          return;
        }

        if (imageFiles.length < SELLER_PRODUCT_MIN_IMAGES) {
          showToast(`Add at least ${SELLER_PRODUCT_MIN_IMAGES} product images from your device.`, 'warning');
          return;
        }

        if (imageFiles.length > SELLER_PRODUCT_MAX_IMAGES) {
          showToast(`You can upload up to ${SELLER_PRODUCT_MAX_IMAGES} product images per listing.`, 'warning');
          return;
        }

        if (imageFiles.some((file) => !String(file.type || '').startsWith('image/'))) {
          showToast('Only image files are allowed for product uploads.', 'warning');
          return;
        }

        const originalButtonText = submitButton?.textContent || '';
        submitButton?.setAttribute('disabled', 'disabled');
        if (submitButton) submitButton.textContent = 'Processing Images...';

        let storedImages = [];
        try {
          storedImages = await prepareProductImages(imageFiles);
        } catch (error) {
          if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.removeAttribute('disabled');
          }
          showToast(error?.message || 'Could not process the selected images.', 'error');
          return;
        }

        if (storedImages.length < SELLER_PRODUCT_MIN_IMAGES) {
          if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.removeAttribute('disabled');
          }
          showToast(`At least ${SELLER_PRODUCT_MIN_IMAGES} valid product images are required.`, 'warning');
          return;
        }

        const products = getJson(STORAGE.sellerProducts, []);
        const sellerVerificationStatus = getSellerVerificationStatus(state.user.email);
        products.unshift({
          id: Date.now(),
          sellerEmail: state.user.email,
          seller: state.user.storeName || state.user.fullName,
          sellerInitials: initialsFromName(state.user.storeName || state.user.fullName),
          name: values.name,
          category: values.category,
          categoryLabel: values.category.replaceAll('_', ' '),
          brand: values.brand,
          stock: Number(values.stock),
          price: Number(values.price),
          comparePrice: Number(values.compare_price || 0),
          image: storedImages[0],
          images: storedImages,
          description: values.description,
          isFeatured: values.is_featured === '1',
          sellerVerified: sellerVerificationStatus === 'verified',
          sellerVerificationStatus,
          search: [
            values.name,
            values.brand,
            values.category,
            state.user.storeName || state.user.fullName,
          ].join(' ').toLowerCase(),
          createdAt: new Date().toISOString(),
        });

        try {
          setJson(STORAGE.sellerProducts, products);
        } catch (error) {
          if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.removeAttribute('disabled');
          }
          showToast('These images are too large to save right now. Try fewer or smaller photos.', 'error');
          return;
        }

        productForm.reset();
        renderProductImagePreview([]);
        if (submitButton) {
          submitButton.textContent = originalButtonText;
          submitButton.removeAttribute('disabled');
        }
        renderPortal();
        showToast('Product listing saved with local device images.', 'success');
      });
    }

    renderPortal();
  }

  function syncDashboard() {
    const dashboard = document.getElementById('dashboard-page');
    if (!dashboard) return;

    const gate = document.getElementById('dashboard-gate');
    const content = document.getElementById('dashboard-content');
    if (!state.user) {
      if (gate) gate.style.display = '';
      if (content) content.style.display = 'none';
      return;
    }

    if (gate) gate.style.display = 'none';
    if (content) content.style.display = '';

    const favorites = getFavorites();
    const requests = getJson(STORAGE.vetRequests, []).filter((entry) => entry.email === state.user.email);
    const sellerApps = getJson(STORAGE.sellerApps, []).filter((entry) => entry.email === state.user.email);
    const sellerDogs = getJson(STORAGE.sellerDogs, []).filter((entry) => entry.sellerEmail === state.user.email);
    const sellerProducts = getJson(STORAGE.sellerProducts, []).filter((entry) => entry.sellerEmail === state.user.email);

    const map = {
      'dashboard-user-name': state.user.fullName,
      'dashboard-user-role': state.user.role,
      'dashboard-cart-count': String(state.cart.reduce((sum, item) => sum + item.qty, 0)),
      'dashboard-favorite-count': String(favorites.length),
      'dashboard-request-count': String(requests.length),
      'dashboard-seller-count': String(sellerApps.length + sellerDogs.length + sellerProducts.length),
    };

    Object.entries(map).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    const cartList = document.getElementById('dashboard-cart-list');
    if (cartList) {
      cartList.innerHTML = state.cart.length ? state.cart.map((item) => `
        <div style="display:flex;justify-content:space-between;gap:1rem;padding:0.875rem;border-radius:var(--radius-lg);background:var(--cream);margin-bottom:0.75rem">
          <div>
            <div class="font-semibold">${escapeHtml(item.name)}</div>
            <div class="text-xs text-muted">${escapeHtml(item.type)} • qty ${item.qty}</div>
          </div>
          <div class="font-semibold">&#8358;${formatMoney(item.price * item.qty)}</div>
        </div>
      `).join('') : '<p class="text-sm text-muted">No cart activity yet.</p>';
    }
  }

  function syncAdmin() {
    const adminPage = document.getElementById('admin-page');
    if (!adminPage) return;

    const gate = document.getElementById('admin-gate');
    const content = document.getElementById('admin-content');
    if (!state.user || state.user.role !== 'admin') {
      if (gate) gate.style.display = '';
      if (content) content.style.display = 'none';
      return;
    }

    if (gate) gate.style.display = 'none';
    if (content) content.style.display = '';

    const users = currentUsers();
    const vetRequests = getJson(STORAGE.vetRequests, []);
    const sellerApps = getJson(STORAGE.sellerApps, []);
    const sellerDogs = getJson(STORAGE.sellerDogs, []);
    const blockedUsers = users.filter((user) => user.blocked);

    const map = {
      'admin-user-count': String(users.length),
      'admin-dog-count': String((DATA.dogs || []).length + sellerDogs.length),
      'admin-vet-count': String(vetRequests.length),
      'admin-blocked-count': String(blockedUsers.length),
    };

    Object.entries(map).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    const userTable = document.getElementById('admin-user-table');
    if (userTable) {
      userTable.innerHTML = users.length ? users.map((user) => {
        const isSelf = user.email === state.user.email;
        const status = user.blocked ? 'blocked' : 'active';
        const badgeClass = user.blocked ? 'badge-rejected' : 'badge-approved';
        return `
          <tr>
            <td>${escapeHtml(user.fullName)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.role)}</td>
            <td><span class="status-badge ${badgeClass}">${escapeHtml(status)}</span></td>
            <td>
              <div class="admin-action-stack">
                ${isSelf
                  ? '<button type="button" class="btn btn-secondary btn-sm" disabled>Your Account</button>'
                  : user.blocked
                    ? `<button type="button" class="btn btn-secondary btn-sm" data-admin-unblock="${escapeHtml(user.email)}">Unblock</button>`
                    : `<button type="button" class="btn btn-secondary btn-sm" data-admin-block="${escapeHtml(user.email)}">Block</button>`}
                ${isSelf
                  ? ''
                  : `<button type="button" class="btn btn-danger btn-sm" data-admin-remove="${escapeHtml(user.email)}">Remove</button>`}
              </div>
            </td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="5" class="text-muted">No user accounts available.</td></tr>';

      userTable.querySelectorAll('[data-admin-block]').forEach((button) => {
        if (button.dataset.blockBound === '1') return;
        button.dataset.blockBound = '1';
        button.addEventListener('click', () => {
          setUserBlockedState(button.dataset.adminBlock, true);
          showToast('Account blocked successfully.', 'success');
          syncAdmin();
        });
      });

      userTable.querySelectorAll('[data-admin-unblock]').forEach((button) => {
        if (button.dataset.unblockBound === '1') return;
        button.dataset.unblockBound = '1';
        button.addEventListener('click', () => {
          setUserBlockedState(button.dataset.adminUnblock, false);
          showToast('Account unblocked successfully.', 'success');
          syncAdmin();
        });
      });

      userTable.querySelectorAll('[data-admin-remove]').forEach((button) => {
        if (button.dataset.removeBound === '1') return;
        button.dataset.removeBound = '1';
        button.addEventListener('click', () => {
          removeAccountByEmail(button.dataset.adminRemove);
          showToast('Account removed successfully.', 'success');
          syncAdmin();
        });
      });
    }

    const sellerTable = document.getElementById('admin-seller-table');
    if (sellerTable) {
      sellerTable.innerHTML = sellerApps.length ? sellerApps.map((app) => `
        <tr>
          <td>${escapeHtml(app.full_name)}</td>
          <td>${escapeHtml(app.state)}</td>
          <td><span class="status-badge ${getSellerVerificationStatus(app.email) === 'verified' ? 'badge-approved' : getSellerVerificationStatus(app.email) === 'pending' ? 'badge-pending' : 'badge-rejected'}">${escapeHtml(getSellerVerificationStatus(app.email))}</span></td>
          <td>
            ${getSellerVerificationStatus(app.email) === 'verified'
              ? '<button type="button" class="btn btn-secondary btn-sm" disabled>Verified</button>'
              : `<button type="button" class="btn btn-primary btn-sm" data-verify-seller="${escapeHtml(app.email)}">Verify</button>`}
          </td>
        </tr>
      `).join('') : '<tr><td colspan="4" class="text-muted">No seller applications yet.</td></tr>';

      sellerTable.querySelectorAll('[data-verify-seller]').forEach((button) => {
        if (button.dataset.verifyBound === '1') return;
        button.dataset.verifyBound = '1';
        button.addEventListener('click', () => {
          const email = button.dataset.verifySeller;
          syncSellerVerificationStatus(email, 'verified');
          showToast('Seller marked as verified.', 'success');
          syncAdmin();
        });
      });
    }

    const requestTable = document.getElementById('admin-vet-table');
    if (requestTable) {
      requestTable.innerHTML = vetRequests.length ? vetRequests.map((request) => `
        <tr>
          <td>${escapeHtml(request.full_name)}</td>
          <td>${escapeHtml(request.state)}</td>
          <td><span class="status-badge ${request.urgency === 'emergency' ? 'badge-rejected' : request.urgency === 'urgent' ? 'badge-pending' : 'badge-approved'}">${escapeHtml(request.urgency)}</span></td>
        </tr>
      `).join('') : '<tr><td colspan="3" class="text-muted">No vet requests yet.</td></tr>';
    }
  }

  function initLogout() {
    document.querySelectorAll('[data-logout]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        saveSession(null);
        showToast('Signed out.', 'info');
        window.setTimeout(() => navigateTo('index.html'), 350);
      });
    });
  }

  function initRecentVetRequests() {
    const host = document.getElementById('recent-vet-requests');
    if (!host) return;

    const items = getJson(STORAGE.vetRequests, []).slice(-3).reverse();
    host.innerHTML = items.length ? items.map((request) => `
      <div style="padding:0.875rem;border-radius:var(--radius-lg);background:var(--cream);margin-bottom:0.75rem">
        <div class="font-semibold" style="font-size:0.9rem">${escapeHtml(request.full_name)} • ${escapeHtml(request.state)}</div>
        <div class="text-xs text-muted" style="margin-top:0.25rem">${escapeHtml(request.urgency)} priority</div>
      </div>
    `).join('') : '<p class="text-sm text-muted">No vet requests submitted yet.</p>';
  }

  function initPhoneSanitizer() {
    document.querySelectorAll('input[type="tel"]').forEach((input) => {
      input.addEventListener('input', () => {
        let value = input.value.replace(/\D/g, '');
        if (value.startsWith('234')) value = `0${value.slice(3)}`;
        if (value.length > 11) value = value.slice(0, 11);
        input.value = value;
      });
    });
  }

  function initScrollAnimations() {
    const targets = document.querySelectorAll('.fade-in-up');
    if (!targets.length || !('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    targets.forEach((element) => observer.observe(element));
  }

  function init() {
    const users = currentUsers();
    state.user = getJson(STORAGE.user, null);
    state.cart = getJson(STORAGE.cart, []);

    if (state.user) {
      const activeUser = users.find((user) => user.email === state.user.email);
      if (!activeUser || activeUser.blocked) {
        saveSession(null);
      } else {
        state.user = {
          ...state.user,
          role: activeUser.role,
          approved: Boolean(activeUser.approved),
          blocked: Boolean(activeUser.blocked),
        };
        setJson(STORAGE.user, state.user);
      }
    }

    syncNavState();
    syncActiveNav();
    initNavigation();
    initCart();
    initAddToCartButtons();
    initFavorites();
    initHeroSlider();
    initGallery();
    initHeroSearch();
    initMarketplaceFilters();
    initProductFilters();
    initLoginForm();
    initRegisterForm();
    initVetForm();
    initSellerForm();
    initSellerPortal();
    syncDashboard();
    syncAdmin();
    initLogout();
    initRecentVetRequests();
    initPhoneSanitizer();
    initScrollAnimations();
  }

  window.NaijaPaws = {
    formatMoney,
    formatAge,
    showToast,
    getSellerVerificationStatus,
    refreshInteractiveContent() {
      initAddToCartButtons();
      initFavorites();
      applyMarketplaceFilters();
      applyProductFilters();
      initScrollAnimations();
      updateCartBadge();

      // Initialize back-to-top button
      initBackToTop();
    },
  };

  function initBackToTop() {
    const backToTopBtn = document.querySelector('.back-to-top');
    if (!backToTopBtn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
 }());

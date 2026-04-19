'use strict';

(function () {
  const DATA = window.NaijaPawsData || {};
  const STORAGE = {
    users: 'np_registered_users',
    user: 'np_session_user',
    cart: 'np_cart',
    favorites: 'np_favorites',
    vetRequests: 'np_vet_requests',
    sellerApps: 'np_seller_applications',
  };

  const state = {
    user: null,
    cart: [],
  };

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

  function currentUsers() {
    const savedUsers = getJson(STORAGE.users, []);
    const existingEmails = new Set(savedUsers.map((user) => user.email));
    const merged = [...savedUsers];
    (DATA.demoUsers || []).forEach((user) => {
      if (!existingEmails.has(user.email)) {
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
      element.setAttribute('href', state.user.role === 'admin' ? 'admin/index.html' : 'dashboard.html');
      element.textContent = state.user.role === 'admin' ? 'Admin' : 'Dashboard';
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
      navigateTo(state.user.role === 'admin' ? 'admin/index.html' : 'dashboard.html');
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

      saveSession({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        approved: Boolean(user.approved),
      });

      showToast('Signed in successfully.', 'success');
      window.setTimeout(() => {
        navigateTo(state.user.role === 'admin' ? 'admin/index.html' : 'dashboard.html');
      }, 400);
    });
  }

  function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
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

      const users = currentUsers();
      if (users.some((user) => user.email.toLowerCase() === String(values.email).toLowerCase())) {
        showToast('That email is already registered.', 'error');
        return;
      }

      users.push({
        id: Date.now(),
        fullName: values.full_name,
        email: values.email.toLowerCase(),
        phone: values.phone,
        password: values.password,
        role: 'buyer',
        state: values.state,
      });
      setJson(STORAGE.users, users);
      showToast('Account created successfully.', 'success');
      window.setTimeout(() => navigateTo('login.html'), 500);
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
        statusBox.style.display = '';
        statusBox.innerHTML = `
          <div class="verification-card" style="background:var(--success-bg);border-color:rgba(22,101,52,0.2)">
            <h3 style="font-family:var(--font-display);margin-bottom:0.5rem;color:var(--success)">Application already saved</h3>
            <p class="text-sm" style="color:var(--success)">Current status: ${escapeHtml(existing.status)}</p>
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
      showToast('Seller application submitted.', 'success');
      window.setTimeout(() => window.location.reload(), 500);
    });
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

    const map = {
      'dashboard-user-name': state.user.fullName,
      'dashboard-user-role': state.user.role,
      'dashboard-cart-count': String(state.cart.reduce((sum, item) => sum + item.qty, 0)),
      'dashboard-favorite-count': String(favorites.length),
      'dashboard-request-count': String(requests.length),
      'dashboard-seller-count': String(sellerApps.length),
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

    const vetRequests = getJson(STORAGE.vetRequests, []);
    const sellerApps = getJson(STORAGE.sellerApps, []);

    const map = {
      'admin-user-count': String(currentUsers().length),
      'admin-dog-count': String((DATA.dogs || []).length),
      'admin-vet-count': String(vetRequests.length),
      'admin-seller-count': String(sellerApps.length),
    };

    Object.entries(map).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    const sellerTable = document.getElementById('admin-seller-table');
    if (sellerTable) {
      sellerTable.innerHTML = sellerApps.length ? sellerApps.map((app) => `
        <tr>
          <td>${escapeHtml(app.full_name)}</td>
          <td>${escapeHtml(app.state)}</td>
          <td><span class="status-badge badge-pending">${escapeHtml(app.status)}</span></td>
        </tr>
      `).join('') : '<tr><td colspan="3" class="text-muted">No seller applications yet.</td></tr>';
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
    `).join('') : '<p class="text-sm text-muted">No vet requests submitted on this browser yet.</p>';
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
    currentUsers();
    state.user = getJson(STORAGE.user, null);
    state.cart = getJson(STORAGE.cart, []);

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
  };

  document.addEventListener('DOMContentLoaded', init);
 }());

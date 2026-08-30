/**
 * MoneyLink — Application Frontend Interactive & E-Commerce Séquestre
 * Connectée à l'API PostgreSQL en temps réel (Parcours Client & Marchand)
 */

// 1. Configuration de l'API Backend MoneyLink
const API_BASE_URL = window.MONEYLINK_API_URL || 'https://moneylink-kd6v.onrender.com';

// 2. État Global de l'Application
const AppState = {
  user: null,
  token: null,
  cart: [],
  catalog: [],
  selectedCategory: 'Tous',
  searchQuery: '',
  selectedProductForDetail: null,
  selectedPaymentMethod: 'WAVE_MOCK',
  activeTab: 'login-tab'
};

// ============================================================================
// 3. API CLIENT CENTRALISÉ (AVEC GESTION AUTOMATIQUE JWT & ERREURS)
// ============================================================================
const Api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (AppState.token) {
      headers['Authorization'] = `Bearer ${AppState.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // En cas de token expiré (401 non autorisé sur route protégée)
        if (response.status === 401 && AppState.token && !endpoint.includes('/auth/login')) {
          Auth.logout();
          Toast.show('Votre session a expiré. Veuillez vous reconnecter.', 'warning');
        }
        const errorMsg = data.error || (data.errors ? data.errors.map(e => e.message).join(', ') : `Erreur HTTP ${response.status}`);
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`[MoneyLink API Error] ${endpoint} :`, err.message);
      throw err;
    }
  },

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
  patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// ============================================================================
// 4. GESTION DU SYSTÈME DE TOASTS & NOTIFICATIONS
// ============================================================================
const Toast = {
  show(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <span style="font-size: 18px;">${icons[type] || '🔔'}</span>
      <div style="flex-grow: 1; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ============================================================================
// 5. GESTIONNAIRE D'AUTHENTIFICATION & SESSIONS (CLIENT / MARCHAND)
// ============================================================================
const Auth = {
  init() {
    try {
      const savedUser = localStorage.getItem('moneylink_user');
      const savedToken = localStorage.getItem('moneylink_token');
      if (savedUser && savedToken) {
        AppState.user = JSON.parse(savedUser);
        AppState.token = savedToken;
      }
    } catch (e) {
      localStorage.removeItem('moneylink_user');
      localStorage.removeItem('moneylink_token');
    }
    this.updateUI();
  },

  async login(identifier, password) {
    try {
      // Nettoyage préventif complet de toute ancienne session
      localStorage.removeItem('moneylink_user');
      localStorage.removeItem('moneylink_token');
      localStorage.removeItem('moneylink_admin_user');
      localStorage.removeItem('moneylink_admin_token');
      sessionStorage.clear();

      const res = await Api.post('/auth/login', { identifier, password });
      if (res.success && res.data) {
        AppState.user = res.data.user;
        AppState.token = res.data.token;
        if (res.data.merchant) AppState.user.merchant = res.data.merchant;
        if (res.data.wallet) AppState.user.wallet = res.data.wallet;

        localStorage.setItem('moneylink_user', JSON.stringify(AppState.user));
        localStorage.setItem('moneylink_token', AppState.token);

        Toast.show(`Bienvenue, ${AppState.user.first_name} ! Connexion réussie.`);
        Modal.close('auth-modal');
        this.updateUI();
        this.loadUserDashboard();
        return true;
      }
    } catch (err) {
      Toast.show(err.message, 'error');
      return false;
    }
  },

  async registerClient(data) {
    try {
      localStorage.removeItem('moneylink_user');
      localStorage.removeItem('moneylink_token');
      localStorage.removeItem('moneylink_admin_user');
      localStorage.removeItem('moneylink_admin_token');
      sessionStorage.clear();

      const res = await Api.post('/auth/register', {
        ...data,
        role: 'CLIENT'
      });
      if (res.success && res.data) {
        AppState.user = res.data.user;
        AppState.token = res.data.token;
        localStorage.setItem('moneylink_user', JSON.stringify(AppState.user));
        localStorage.setItem('moneylink_token', AppState.token);

        Toast.show('Compte Client créé avec succès ! 30 jours d’essai offerts.');
        Modal.close('auth-modal');
        this.updateUI();
        this.loadUserDashboard();
        return true;
      }
    } catch (err) {
      Toast.show(err.message, 'error');
      return false;
    }
  },

  async registerMerchant(data) {
    try {
      localStorage.removeItem('moneylink_user');
      localStorage.removeItem('moneylink_token');
      localStorage.removeItem('moneylink_admin_user');
      localStorage.removeItem('moneylink_admin_token');
      sessionStorage.clear();

      const res = await Api.post('/auth/register', {
        ...data,
        role: 'MERCHANT'
      });
      if (res.success && res.data) {
        AppState.user = res.data.user;
        AppState.token = res.data.token;
        if (res.data.merchant) AppState.user.merchant = res.data.merchant;
        localStorage.setItem('moneylink_user', JSON.stringify(AppState.user));
        localStorage.setItem('moneylink_token', AppState.token);

        Toast.show('Espace Marchand créé avec succès ! Vous pouvez publier vos produits.');
        Modal.close('auth-modal');
        this.updateUI();
        this.loadUserDashboard();
        return true;
      }
    } catch (err) {
      Toast.show(err.message, 'error');
      return false;
    }
  },

  logout() {
    AppState.user = null;
    AppState.token = null;
    AppState.cart = [];
    localStorage.removeItem('moneylink_user');
    localStorage.removeItem('moneylink_token');
    localStorage.removeItem('moneylink_cart');
    localStorage.removeItem('moneylink_admin_user');
    localStorage.removeItem('moneylink_admin_token');
    sessionStorage.clear();
    Cart.updateUI();
    Toast.show('Déconnexion effectuée.', 'info');
    this.updateUI();
  },

  updateUI() {
    const authContainer = document.getElementById('nav-auth-container');
    const portalSection = document.getElementById('user-portal-section');
    const clientView = document.getElementById('client-portal-view');
    const merchantView = document.getElementById('merchant-portal-view');

    if (!authContainer) return;

    if (AppState.user && AppState.token) {
      const isMerchant = AppState.user.role === 'MERCHANT';
      
      // Contrôle d'identité strict Super Admin (Codé Samb uniquement)
      const cleanPhone = (AppState.user.phone || '').replace(/[\s+-]/g, '');
      const isSuperAdmin = AppState.user.role === 'ADMIN' && (
        AppState.user.id === 'a0000000-0000-0000-0000-000000000001' ||
        (AppState.user.email && AppState.user.email.trim().toLowerCase() === 'admin@moneylink.sn') ||
        cleanPhone.endsWith('770000001')
      );

      let roleLabel = '👤 CLIENT';
      if (isSuperAdmin) {
        roleLabel = '👑 SUPER ADMIN';
      } else if (isMerchant) {
        roleLabel = '🏪 MARCHAND';
      }

      const displayName = isMerchant
        ? (AppState.user.merchant?.business_name || `${AppState.user.first_name} Store`)
        : `${AppState.user.first_name} ${AppState.user.last_name}`;

      authContainer.innerHTML = `
        <div class="user-nav-dropdown">
          <button id="user-menu-btn" class="user-nav-btn">
            <span>${isSuperAdmin ? '👑' : (isMerchant ? '🏪' : '👤')}</span>
            <span>${escapeHTML(displayName)}</span>
            <span style="font-size: 10px;">▼</span>
          </button>
          <div id="user-menu-popover" class="user-menu-popover">
            <div class="user-menu-header">
              <div class="user-menu-name">${escapeHTML(displayName)}</div>
              <div class="user-menu-role-tag">${roleLabel}</div>
            </div>
            ${isSuperAdmin ? `
              <a class="user-menu-link" id="menu-admin-console-link" href="https://moneylink-1.onrender.com" target="_blank" rel="noopener" style="color: #00E59B; font-weight: 700;">
                <span>⚙️</span> Console Super Admin
              </a>
            ` : ''}
            <a class="user-menu-link" id="menu-my-space-btn">
              <span>📊</span> Mon Espace (${isMerchant ? 'Ventes & Stock' : 'Mes Commandes'})
            </a>
            <a class="user-menu-link" id="menu-explore-catalog-btn" href="#catalogue">
              <span>🛍️</span> Catalogue Public
            </a>
            <a class="user-menu-link logout-link" id="menu-logout-btn">
              <span>🚪</span> Déconnexion
            </a>
          </div>
        </div>
      `;

      // Event Listeners Menu Utilisateur
      const menuBtn = document.getElementById('user-menu-btn');
      const menuPopover = document.getElementById('user-menu-popover');
      if (menuBtn && menuPopover) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          menuPopover.classList.toggle('active');
        });
        document.addEventListener('click', () => menuPopover.classList.remove('active'));
      }

      document.getElementById('menu-my-space-btn')?.addEventListener('click', () => {
        portalSection.style.display = 'block';
        portalSection.scrollIntoView({ behavior: 'smooth' });
        this.loadUserDashboard();
      });

      document.getElementById('menu-logout-btn')?.addEventListener('click', () => {
        this.logout();
      });

      // Affichage du portail
      portalSection.style.display = 'block';
      if (isMerchant) {
        clientView.style.display = 'none';
        merchantView.style.display = 'block';
      } else {
        merchantView.style.display = 'none';
        clientView.style.display = 'block';
      }

      this.loadUserDashboard();
    } else {
      authContainer.innerHTML = `
        <button id="nav-login-btn" class="btn btn-primary btn-sm">
          Connexion / Compte
        </button>
      `;

      document.getElementById('nav-login-btn')?.addEventListener('click', () => {
        Modal.open('auth-modal');
      });

      portalSection.style.display = 'none';
      clientView.style.display = 'none';
      merchantView.style.display = 'none';
    }
  },

  async loadUserDashboard() {
    if (!AppState.user || !AppState.token) return;

    if (AppState.user.role === 'MERCHANT') {
      MerchantPortal.loadStats();
      MerchantPortal.loadProducts();
      MerchantPortal.loadOrders();
    } else {
      ClientPortal.loadOrders();
      ClientPortal.loadProfile();
    }
  }
};

// ============================================================================
// 6. GESTION DU CATALOGUE PUBLIC (#catalogue)
// ============================================================================
const Catalog = {
  async init() {
    this.setupFilters();
    this.setupSearch();
    await this.loadProducts();
  },

  async loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    try {
      let endpoint = '/products';
      const params = new URLSearchParams();

      if (AppState.selectedCategory && AppState.selectedCategory !== 'Tous') {
        params.append('category', AppState.selectedCategory);
      }
      if (AppState.searchQuery.trim()) {
        params.append('search', AppState.searchQuery.trim());
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const res = await Api.get(endpoint);
      if (res.success && Array.isArray(res.data)) {
        AppState.catalog = res.data;
        this.renderProducts(res.data);
      }
    } catch (err) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #EF4444;">
          <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
          Impossible de charger le catalogue actuellement (${escapeHTML(err.message)}).
        </div>
      `;
    }
  },

  renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);">
          <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
          <h4>Aucun produit trouvé</h4>
          <p style="font-size: 14px; margin-top: 4px;">Essayez d'ajuster vos critères de recherche ou de catégorie.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => {
      const isOutOfStock = p.stock <= 0;
      const imageUrl = p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

      return `
        <div class="product-card" data-product-id="${p.id}">
          <div class="product-image-wrap" onclick="Catalog.openDetail('${p.id}')">
            <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(p.name)}" loading="lazy" />
            <span class="product-category-tag">${escapeHTML(p.category || 'Général')}</span>
            <span class="product-escrow-badge">🔒 100% Séquestre</span>
          </div>
          <div class="product-card-body">
            <div class="product-merchant-info">
              <span>🏪</span>
              <span>${escapeHTML(p.merchant_name || 'Boutique Agréée')}</span>
              ${p.merchant_is_verified ? '<span class="merchant-verified-tick" title="Marchand Vérifié">✓</span>' : ''}
              <span>• ${escapeHTML(p.merchant_city || 'Dakar')}</span>
            </div>
            <h4 class="product-title" onclick="Catalog.openDetail('${p.id}')">${escapeHTML(p.name)}</h4>
            <p class="product-description-snippet">${escapeHTML(p.description || 'Produit garanti par le tiers de confiance MoneyLink.')}</p>
            <div class="product-card-footer">
              <div class="product-price-box">
                <span class="product-price">${formatFCFA(p.price)}</span>
                <span class="product-stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
                  ${isOutOfStock ? 'Rupture de stock' : `En stock (${p.stock})`}
                </span>
              </div>
              <button class="btn-add-cart" onclick="Cart.add('${p.id}')" ${isOutOfStock ? 'disabled' : ''}>
                <span>🛒</span>
                <span>Ajouter</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  setupFilters() {
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.selectedCategory = pill.dataset.category || 'Tous';
        this.loadProducts();
      });
    });
  },

  setupSearch() {
    const searchInput = document.getElementById('catalog-search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        AppState.searchQuery = e.target.value;
        this.loadProducts();
      }, 350);
    });
  },

  openDetail(productId) {
    const product = AppState.catalog.find(p => p.id === productId);
    if (!product) return;

    AppState.selectedProductForDetail = product;
    const body = document.getElementById('product-detail-body');
    if (!body) return;

    const isOutOfStock = product.stock <= 0;
    const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

    body.innerHTML = `
      <div style="border-radius: var(--radius-md); overflow: hidden; height: 260px; background: #F1F5F9; margin-bottom: 20px;">
        <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(product.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <span class="badge badge-emerald" style="margin-bottom: 8px;">${escapeHTML(product.category || 'Général')}</span>
          <h3 style="font-size: 22px; color: var(--secondary); margin-top: 4px;">${escapeHTML(product.name)}</h3>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: 800; color: var(--primary);">${formatFCFA(product.price)}</div>
          <div class="product-stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
            ${isOutOfStock ? 'Rupture' : `En stock (${product.stock} dispo)`}
          </div>
        </div>
      </div>

      <div style="background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 18px;">
        <div style="font-weight: 700; font-size: 13.5px; color: var(--secondary); margin-bottom: 4px;">
          🏪 Vendu par : ${escapeHTML(product.merchant_name || 'Boutique Agréée MoneyLink')}
        </div>
        <div style="font-size: 12.5px; color: var(--text-muted);">
          📍 Ville : ${escapeHTML(product.merchant_city || 'Dakar')} • 📞 Contact sécurisé MoneyLink
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 14px; color: var(--secondary); margin-bottom: 6px;">Description de l'article :</h4>
        <p style="font-size: 14px; color: var(--text-main); line-height: 1.6;">
          ${escapeHTML(product.description || 'Aucune description spécifique fournie pour cet article.')}
        </p>
      </div>

      <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: var(--radius-sm); padding: 14px; margin-bottom: 24px; display: flex; gap: 12px; align-items: center;">
        <span style="font-size: 24px;">🔒</span>
        <div style="font-size: 12.5px; color: #166534; line-height: 1.4;">
          <strong>Garantie Tiers de Confiance :</strong> L'argent n'est débloqué au marchand qu'après remise de votre code secret OTP lors de la livraison.
        </div>
      </div>

      <div style="display: flex; gap: 12px;">
        <button class="btn btn-primary" style="flex-grow: 1;" onclick="Cart.add('${product.id}'); Modal.close('product-detail-modal');" ${isOutOfStock ? 'disabled' : ''}>
          🛒 Ajouter au Panier (${formatFCFA(product.price)})
        </button>
      </div>
    `;

    Modal.open('product-detail-modal');
  }
};

// ============================================================================
// 7. GESTION DU PANIER D'ACHAT & COMMANDE (#cart-drawer)
// ============================================================================
const Cart = {
  init() {
    try {
      const saved = localStorage.getItem('moneylink_cart');
      if (saved) AppState.cart = JSON.parse(saved);
    } catch (e) {
      AppState.cart = [];
    }
    this.updateUI();
    this.setupListeners();
  },

  add(productId, quantity = 1) {
    const product = AppState.catalog.find(p => p.id === productId);
    if (!product) return;

    const existing = AppState.cart.find(item => item.product.id === productId);
    if (existing) {
      existing.quantity += quantity;
      if (existing.quantity > product.stock) existing.quantity = product.stock;
    } else {
      AppState.cart.push({
        product,
        quantity: Math.min(quantity, product.stock || 1)
      });
    }

    this.save();
    this.updateUI();
    Toast.show(`"${product.name}" ajouté à votre panier ! 🛒`);
  },

  remove(productId) {
    AppState.cart = AppState.cart.filter(item => item.product.id !== productId);
    this.save();
    this.updateUI();
  },

  updateQuantity(productId, delta) {
    const item = AppState.cart.find(i => i.product.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.remove(productId);
      return;
    }
    if (item.product.stock && item.quantity > item.product.stock) {
      item.quantity = item.product.stock;
      Toast.show(`Stock maximum disponible atteint (${item.product.stock}).`, 'warning');
    }

    this.save();
    this.updateUI();
  },

  clear() {
    AppState.cart = [];
    this.save();
    this.updateUI();
  },

  save() {
    localStorage.setItem('moneylink_cart', JSON.stringify(AppState.cart));
  },

  getTotals() {
    const subtotal = AppState.cart.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const escrowFee = Math.round(subtotal * 0.01); // 1%
    const total = subtotal + escrowFee;
    return { subtotal, escrowFee, total };
  },

  updateUI() {
    const badge = document.getElementById('cart-badge-count');
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const feeEl = document.getElementById('cart-escrow-fee');
    const totalEl = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    const totalCount = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) badge.textContent = totalCount.toString();

    if (!container) return;

    if (AppState.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 40px; margin-bottom: 12px;">🛍️</div>
          <h4>Votre panier est vide</h4>
          <p style="font-size: 13.5px; margin-top: 6px;">Explorez le catalogue public pour ajouter des articles sécurisés.</p>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '0 FCFA';
      if (feeEl) feeEl.textContent = '0 FCFA';
      if (totalEl) totalEl.textContent = '0 FCFA';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    const { subtotal, escrowFee, total } = this.getTotals();
    if (subtotalEl) subtotalEl.textContent = formatFCFA(subtotal);
    if (feeEl) feeEl.textContent = formatFCFA(escrowFee);
    if (totalEl) totalEl.textContent = formatFCFA(total);
    if (checkoutBtn) checkoutBtn.disabled = false;

    container.innerHTML = AppState.cart.map(item => {
      const p = item.product;
      const imageUrl = p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
      const lineTotal = parseFloat(p.price) * item.quantity;

      return `
        <div class="cart-item-row">
          <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(p.name)}" class="cart-item-img" />
          <div class="cart-item-details">
            <div class="cart-item-title">${escapeHTML(p.name)}</div>
            <div class="cart-item-price">${formatFCFA(lineTotal)}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              ${formatFCFA(p.price)} / unité • Vendeur: ${escapeHTML(p.merchant_name || 'Marchand')}
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
              <div class="stock-stepper">
                <button class="stock-stepper-btn" onclick="Cart.updateQuantity('${p.id}', -1)">-</button>
                <span class="stock-stepper-val">${item.quantity}</span>
                <button class="stock-stepper-btn" onclick="Cart.updateQuantity('${p.id}', 1)">+</button>
              </div>
              <button style="background: none; border: none; color: #EF4444; font-size: 12px; cursor: pointer;" onclick="Cart.remove('${p.id}')">
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  setupListeners() {
    document.getElementById('open-cart-btn')?.addEventListener('click', () => {
      document.getElementById('cart-drawer-backdrop')?.classList.add('active');
    });

    document.getElementById('close-cart-btn')?.addEventListener('click', () => {
      document.getElementById('cart-drawer-backdrop')?.classList.remove('active');
    });

    document.getElementById('cart-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'cart-drawer-backdrop') {
        document.getElementById('cart-drawer-backdrop').classList.remove('active');
      }
    });

    document.getElementById('cart-checkout-btn')?.addEventListener('click', () => {
      if (!AppState.user || !AppState.token) {
        Toast.show('Veuillez vous connecter ou créer un compte pour passer commande.', 'info');
        Modal.open('auth-modal');
        return;
      }
      document.getElementById('cart-drawer-backdrop')?.classList.remove('active');
      Checkout.open();
    });
  }
};

// ============================================================================
// 8. PROCESSUS DE CHECKOUT & PAIEMENT SOUS SÉQUESTRE
// ============================================================================
const Checkout = {
  open() {
    if (AppState.cart.length === 0) {
      Toast.show('Votre panier est vide.', 'warning');
      return;
    }

    const { total } = Cart.getTotals();
    const displayEl = document.getElementById('checkout-total-display');
    const phoneInput = document.getElementById('checkout-phone');

    if (displayEl) displayEl.textContent = formatFCFA(total);
    if (phoneInput && AppState.user) phoneInput.value = AppState.user.phone || '';

    Modal.open('checkout-modal');
  },

  async submit(formData) {
    const submitBtn = document.getElementById('checkout-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳</span><span>Création de la commande...</span>';
    }

    try {
      // 1. Groupement par premier marchand du panier (architecture multi-vendeur)
      const primaryMerchantId = AppState.cart[0].product.merchant_id;

      // 2. Création de la commande avec recalcul serveur et génération code OTP
      const orderPayload = {
        merchant_id: primaryMerchantId,
        items: AppState.cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        delivery_address: formData.address,
        delivery_phone: formData.phone,
        delivery_notes: formData.notes
      };

      const orderRes = await Api.post('/orders', orderPayload);
      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.error || 'Échec de création de commande.');
      }

      const createdOrder = orderRes.data;

      // 3. Succès ! Nettoyage du panier et fermeture modale de saisie
      Cart.clear();
      Modal.close('checkout-modal');

      // 4. Remplissage et affichage de la modale de confirmation
      const confRefEl = document.getElementById('conf-order-ref');
      const confShopEl = document.getElementById('conf-shop-name');
      const confTotalEl = document.getElementById('conf-order-total');
      const confAddressEl = document.getElementById('conf-order-address');
      const confDeliveryInfoEl = document.getElementById('conf-delivery-person-info');
      const confCodeEl = document.getElementById('conf-delivery-code');
      const confWaBtn = document.getElementById('conf-whatsapp-btn');

      if (confRefEl) confRefEl.textContent = createdOrder.order_number;
      if (confShopEl) confShopEl.textContent = createdOrder.merchant?.business_name || 'Boutique Partenaire';
      if (confTotalEl) confTotalEl.textContent = formatFCFA(createdOrder.total_amount);
      if (confAddressEl) confAddressEl.textContent = createdOrder.delivery_address;
      
      if (confDeliveryInfoEl) {
        if (createdOrder.delivery_person) {
          confDeliveryInfoEl.innerHTML = `<strong>${escapeHTML(createdOrder.delivery_person.first_name)} ${escapeHTML(createdOrder.delivery_person.last_name)}</strong> • 📞 <a href="tel:${escapeHTML(createdOrder.delivery_person.phone)}" style="color: inherit; text-decoration: underline;">${escapeHTML(createdOrder.delivery_person.phone)}</a>`;
        } else {
          confDeliveryInfoEl.textContent = 'En cours d\'affectation à un coursier partenaire';
        }
      }

      if (confCodeEl) confCodeEl.textContent = createdOrder.delivery_code || '------';
      if (confWaBtn && createdOrder.whatsapp_url) {
        confWaBtn.href = createdOrder.whatsapp_url;
      }

      Modal.open('order-confirmation-modal');

      // Ouverture automatique WhatsApp si URL disponible
      if (createdOrder.whatsapp_url) {
        window.open(createdOrder.whatsapp_url, '_blank');
      }

      Toast.show(`Commande #${createdOrder.order_number} enregistrée ! En attente de confirmation.`, 'success');
      Auth.loadUserDashboard();

    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>💬</span><span>Commander via WhatsApp</span>';
      }
    }
  }
};

// ============================================================================
// 9. ESPACE PORTAIL CLIENT (#client-portal-view)
// ============================================================================
const ClientPortal = {
  async loadProfile() {
    try {
      const res = await Api.get('/auth/profile');
      if (res.success && res.data) {
        const u = res.data.user;
        const w = res.data.wallet;
        document.getElementById('client-greeting-name').textContent = `Bonjour, ${u.first_name} ${u.last_name}`;
        document.getElementById('client-phone-display').textContent = u.phone;
        document.getElementById('client-wallet-balance').textContent = formatFCFA(w?.available_balance || 0);
        document.getElementById('client-sub-badge').textContent = `${u.subscription_status || 'TRIAL'} (Pass 500 F)`;
      }
    } catch (err) {
      console.warn('Erreur chargement profil client :', err.message);
    }
  },

  async loadOrders() {
    const listContainer = document.getElementById('client-orders-list');
    const totalOrdersEl = document.getElementById('client-total-orders');
    if (!listContainer) return;

    try {
      const res = await Api.get('/orders');
      if (res.success && Array.isArray(res.data)) {
        const orders = res.data;
        if (totalOrdersEl) totalOrdersEl.textContent = orders.length.toString();

        if (orders.length === 0) {
          listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--surface-alt); border-radius: var(--radius-md);">
              <div style="font-size: 36px; margin-bottom: 12px;">📦</div>
              <h4 style="color: var(--secondary); margin-bottom: 6px; font-size: 16px;">Vous n'avez pas encore passé de commande.</h4>
              <p style="font-size: 14px; margin-bottom: 18px;">Explorez notre catalogue pour découvrir les produits disponibles.</p>
              <a href="#catalogue" class="btn btn-primary btn-sm" style="display: inline-block;">🛍️ Explorer le catalogue</a>
            </div>
          `;
          return;
        }

        listContainer.innerHTML = orders.map(order => {
          const itemsHtml = (order.items || []).map(i => `
            <div class="order-item-row">
              <span>${escapeHTML(i.product_name)} × ${i.quantity}</span>
              <strong>${formatFCFA(i.total_price || (i.unit_price * i.quantity))}</strong>
            </div>
          `).join('');

          const isLockedOrShipped = order.status === 'PAYMENT_CONFIRMED' || order.status === 'SHIPPED';
          const isPendingPayment = order.status === 'PENDING_PAYMENT';

          return `
            <div class="order-card">
              <div class="order-card-header">
                <div>
                  <span class="order-num">Commande #${escapeHTML(order.order_number)}</span>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                    Marchand : <strong>${escapeHTML(order.merchant_name || 'Boutique Partenaire')}</strong>${order.merchant_city ? ` • 📍 ${escapeHTML(order.merchant_city)}` : ''} • 📅 ${new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div>
                  <span class="order-badge ${order.status}">${formatOrderStatus(order.status)}</span>
                </div>
              </div>

              <div class="order-items-summary">
                ${itemsHtml}
                <div style="display: flex; justify-content: space-between; padding-top: 8px; margin-top: 8px; border-top: 1px dashed var(--border); font-size: 15px; font-weight: 800;">
                  <span>Montant Total :</span>
                  <span style="color: var(--primary-dark);">${formatFCFA(order.total_amount)}</span>
                </div>
              </div>

              <!-- Information Livreur -->
              ${order.delivery_person ? `
                <div style="background: #F8FAFC; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-top: 10px; font-size: 13px;">
                  🚚 <strong>Livreur :</strong> ${escapeHTML(order.delivery_person.first_name)} ${escapeHTML(order.delivery_person.last_name)}
                  (📞 <a href="tel:${escapeHTML(order.delivery_person.phone)}" style="color: var(--primary-dark); font-weight: 600;">${escapeHTML(order.delivery_person.phone)}</a>)
                </div>
              ` : ''}

              <!-- Code Secret OTP -->
              ${order.delivery_code ? `
                <div class="secret-code-display-box" style="margin-top: 10px;">
                  <div class="secret-code-label">🔑 Code Secret de Livraison (OTP)</div>
                  <div class="secret-code-digits">${escapeHTML(order.delivery_code)}</div>
                  <div class="secret-code-warning">
                    🔐 Ne communiquez votre code secret qu'après avoir reçu et vérifié votre colis.
                  </div>
                </div>
              ` : ''}

              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
                ${order.whatsapp_url ? `
                  <a href="${order.whatsapp_url}" target="_blank" rel="noopener" class="btn btn-sm" style="background: #25D366; color: #FFFFFF; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                    <span>💬</span> Continuer la discussion sur WhatsApp
                  </a>
                ` : ''}
                ${isLockedOrShipped ? `
                  <button class="btn btn-primary btn-sm" onclick="ClientPortal.confirmOrder('${order.id}')">
                    ✅ Confirmer Réception
                  </button>
                  <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="ClientPortal.openDispute('${order.id}')">
                    ⚠️ Litige
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      listContainer.innerHTML = `<div style="color: #EF4444; padding: 20px;">Erreur chargement commandes : ${escapeHTML(err.message)}</div>`;
    }
  },

  async confirmOrder(orderId) {
    if (!confirm('Confirmez-vous avoir reçu votre colis conforme ? Les fonds seront immédiatement débloqués au commerçant.')) return;
    try {
      const res = await Api.post(`/orders/${orderId}/confirm`);
      if (res.success) {
        Toast.show('Réception confirmée avec succès ! Transaction clôturée.');
        this.loadOrders();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openDispute(orderId) {
    document.getElementById('dispute-order-id').value = orderId;
    Modal.open('dispute-modal');
  },

  async payPendingOrder(orderId) {
    try {
      const res = await Api.post('/payments/checkout', {
        order_id: orderId,
        payment_method: 'WAVE_MOCK'
      });
      if (res.success) {
        Toast.show('Paiement validé ! Montant mis sous séquestre.', 'success');
        this.loadOrders();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};

// ============================================================================
// 10. ESPACE PORTAIL MARCHAND (#merchant-portal-view)
// ============================================================================
const MerchantPortal = {
  async loadStats() {
    try {
      const res = await Api.get('/merchants/me/stats');
      if (res.success && res.data) {
        const { merchant, wallet, metrics } = res.data;
        if (merchant) {
          document.getElementById('merchant-shop-name').textContent = merchant.business_name;
          document.getElementById('merchant-city-display').textContent = merchant.city || 'Dakar';
        }
        if (metrics) {
          document.getElementById('merchant-kpi-volume').textContent = formatFCFA(metrics.totalSalesVolumeFCFA || 0);
          document.getElementById('merchant-kpi-pending-shipment').textContent = (metrics.pendingShipment || 0).toString();
        }
        if (wallet) {
          document.getElementById('merchant-kpi-wallet-available').textContent = formatFCFA(wallet.available_balance || 0);
          document.getElementById('merchant-kpi-wallet-locked').textContent = formatFCFA(wallet.locked_balance || 0);
        }
      }
    } catch (err) {
      console.warn('Erreur KPIs marchand :', err.message);
    }
  },

  async loadProducts() {
    const container = document.getElementById('merchant-products-list');
    if (!container) return;

    try {
      const res = await Api.get('/merchants/me/products');
      if (res.success && Array.isArray(res.data)) {
        const products = res.data;
        if (products.length === 0) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--surface-alt); border-radius: var(--radius-md);">
              <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
              <p>Vous n'avez pas encore ajouté de produit à votre boutique.</p>
              <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="MerchantPortal.openAddProductModal()">
                ➕ Ajouter mon premier produit
              </button>
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <table class="merchant-products-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <img src="${escapeHTML(p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200')}" alt="${escapeHTML(p.name)}" style="width: 40px; height: 40px; border-radius: var(--radius-sm); object-fit: cover;" />
                      <div>
                        <strong>${escapeHTML(p.name)}</strong>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHTML(p.category || 'Général')}</td>
                  <td><strong>${formatFCFA(p.price)}</strong></td>
                  <td>
                    <div class="stock-stepper">
                      <button class="stock-stepper-btn" onclick="MerchantPortal.adjustStock('${p.id}', ${Math.max(0, p.stock - 1)})">-</button>
                      <span class="stock-stepper-val">${p.stock}</span>
                      <button class="stock-stepper-btn" onclick="MerchantPortal.adjustStock('${p.id}', ${p.stock + 1})">+</button>
                    </div>
                  </td>
                  <td>
                    <span class="order-badge ${p.is_active ? 'CONFIRMED' : 'DISPUTED'}">
                      ${p.is_active ? 'Publié' : 'Désactivé'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-outline btn-sm" style="padding: 4px 8px;" onclick="MerchantPortal.openEditProductModal('${p.id}')">✏️</button>
                      <button class="btn btn-outline btn-sm" style="padding: 4px 8px; color: #EF4444; border-color: #EF4444;" onclick="MerchantPortal.deleteProduct('${p.id}')">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div style="color: #EF4444; padding: 20px;">Erreur chargement catalogue : ${escapeHTML(err.message)}</div>`;
    }
  },

  async loadOrders() {
    const container = document.getElementById('merchant-orders-list');
    const badgeCount = document.getElementById('merchant-orders-count-badge');
    if (!container) return;

    try {
      const res = await Api.get('/orders');
      if (res.success && Array.isArray(res.data)) {
        const orders = res.data;
        if (badgeCount) badgeCount.textContent = orders.length.toString();

        if (orders.length === 0) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--surface-alt); border-radius: var(--radius-md);">
              <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
              <p>Aucune commande reçue pour le moment.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = orders.map(ord => {
          const itemsList = (ord.items || []).map(i => `${escapeHTML(i.product_name)} (×${i.quantity})`).join(', ');
          const isPaid = ord.status === 'PAYMENT_CONFIRMED';
          const isShipped = ord.status === 'SHIPPED';

          return `
            <div class="order-card">
              <div class="order-card-header">
                <div>
                  <span class="order-num">Commande #${escapeHTML(ord.order_number)}</span>
                  <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                    Acheteur : <strong>${escapeHTML(ord.buyer_name || 'Client')}</strong> • 📞 ${escapeHTML(ord.delivery_phone || '')} • 📍 ${escapeHTML(ord.delivery_address || 'Dakar')}
                  </div>
                </div>
                <span class="order-badge ${ord.status}">${formatOrderStatus(ord.status)}</span>
              </div>

              <div style="font-size: 13.5px; margin: 8px 0;">
                Articles commandés : <strong>${itemsList}</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border);">
                <div style="font-size: 15px; font-weight: 800; color: var(--primary-dark);">
                  Total Vente : ${formatFCFA(ord.total_amount)}
                </div>

                <div style="display: flex; gap: 8px;">
                  ${isPaid ? `
                    <button class="btn btn-outline btn-sm" onclick="MerchantPortal.markAsShipped('${ord.id}')">
                      🚚 Marquer Expédié
                    </button>
                  ` : ''}

                  ${isPaid || isShipped ? `
                    <button class="btn btn-primary btn-sm" onclick="MerchantPortal.openOtpValidation('${ord.id}')">
                      🔑 Saisir Code Client (Encaisser)
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      container.innerHTML = `<div style="color: #EF4444; padding: 20px;">Erreur commandes : ${escapeHTML(err.message)}</div>`;
    }
  },

  async adjustStock(productId, newStock) {
    try {
      const res = await Api.patch(`/merchants/products/${productId}/stock`, { stock: newStock });
      if (res.success) {
        Toast.show('Stock mis à jour avec succès.');
        this.loadProducts();
        Catalog.loadProducts(); // Sync catalogue public
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async markAsShipped(orderId) {
    try {
      const res = await Api.put(`/orders/${orderId}/ship`);
      if (res.success) {
        Toast.show('Statut mis à jour : Colis marqué comme expédié.');
        this.loadOrders();
        this.loadStats();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openOtpValidation(orderId) {
    document.getElementById('otp-order-id').value = orderId;
    document.getElementById('otp-code-input').value = '';
    Modal.open('validate-otp-modal');
  },

  async validateOtpCode(orderId, code) {
    try {
      const res = await Api.post(`/orders/${orderId}/validate-code`, { code });
      if (res.success) {
        Modal.close('validate-otp-modal');
        Toast.show('🎉 Code secret validé avec succès ! Fonds débloqués sur votre solde disponible.', 'success');
        this.loadOrders();
        this.loadStats();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openAddProductModal() {
    document.getElementById('prod-edit-id').value = '';
    document.getElementById('product-form-title').textContent = 'Ajouter un Produit';
    document.getElementById('merchant-product-form').reset();
    Modal.open('product-form-modal');
  },

  async openEditProductModal(productId) {
    const res = await Api.get('/merchants/me/products');
    const product = res.data?.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('prod-edit-id').value = product.id;
    document.getElementById('product-form-title').textContent = 'Modifier le Produit';
    document.getElementById('prod-form-name').value = product.name;
    document.getElementById('prod-form-category').value = product.category || 'Général';
    document.getElementById('prod-form-price').value = product.price;
    document.getElementById('prod-form-stock').value = product.stock;
    document.getElementById('prod-form-image').value = product.image_url || '';
    document.getElementById('prod-form-desc').value = product.description || '';

    Modal.open('product-form-modal');
  },

  async deleteProduct(productId) {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce produit du catalogue ?')) return;
    try {
      const res = await Api.delete(`/merchants/products/${productId}`);
      if (res.success) {
        Toast.show('Produit retiré du catalogue.');
        this.loadProducts();
        Catalog.loadProducts();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};

// ============================================================================
// 11. GESTION DES MODALES & DIALOGUES INTERACTIFS
// ============================================================================
const Modal = {
  open(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  },

  close(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  },

  init() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close-modal');
        this.close(id);
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('active');
      });
    });
  }
};

// ============================================================================
// 12. INITIALISATION & GESTIONNAIRES D'ÉVÉNEMENTS DOM
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Catalog.init();
  Cart.init();
  Modal.init();
  initApiStatusCheck();
  initEscrowCalculator();
  initFaqAccordion();
  setupFormHandlers();
});

function setupFormHandlers() {
  // 1. Onglets Auth
  document.querySelectorAll('[data-auth-tab]').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      const targetTab = tabBtn.getAttribute('data-auth-tab');

      document.getElementById('login-form').style.display = targetTab === 'login-tab' ? 'block' : 'none';
      document.getElementById('register-client-form').style.display = targetTab === 'register-client-tab' ? 'block' : 'none';
      document.getElementById('register-merchant-form').style.display = targetTab === 'register-merchant-tab' ? 'block' : 'none';
    });
  });

  // 2. Formulaire Connexion
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    await Auth.login(identifier, password);
  });

  // 3. Formulaire Inscription Client
  document.getElementById('register-client-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await Auth.registerClient({
      first_name: document.getElementById('reg-client-fname').value.trim(),
      last_name: document.getElementById('reg-client-lname').value.trim(),
      phone: document.getElementById('reg-client-phone').value.trim(),
      email: document.getElementById('reg-client-email').value.trim(),
      password: document.getElementById('reg-client-password').value
    });
  });

  // 4. Formulaire Inscription Marchand
  document.getElementById('register-merchant-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await Auth.registerMerchant({
      first_name: document.getElementById('reg-merch-fname').value.trim(),
      last_name: document.getElementById('reg-merch-lname').value.trim(),
      business_name: document.getElementById('reg-merch-shop').value.trim(),
      business_type: document.getElementById('reg-merch-type').value,
      phone: document.getElementById('reg-merch-phone').value.trim(),
      email: document.getElementById('reg-merch-email').value.trim(),
      password: document.getElementById('reg-merch-password').value
    });
  });

  // 5. CTA Hero Marchand
  document.getElementById('hero-merchant-cta')?.addEventListener('click', () => {
    if (AppState.user && AppState.user.role === 'MERCHANT') {
      document.getElementById('user-portal-section').style.display = 'block';
      document.getElementById('user-portal-section').scrollIntoView({ behavior: 'smooth' });
    } else {
      Modal.open('auth-modal');
      const merchTab = document.querySelector('[data-auth-tab="register-merchant-tab"]');
      if (merchTab) merchTab.click();
    }
  });

  // 6. Formulaire Checkout
  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await Checkout.submit({
      address: document.getElementById('checkout-address').value.trim(),
      phone: document.getElementById('checkout-phone').value.trim(),
      notes: document.getElementById('checkout-notes').value.trim()
    });
  });

  // 7. Formulaire Produit Marchand (Ajout / Édition)
  document.getElementById('merchant-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('prod-edit-id').value;
    const payload = {
      name: document.getElementById('prod-form-name').value.trim(),
      category: document.getElementById('prod-form-category').value,
      price: parseFloat(document.getElementById('prod-form-price').value),
      stock: parseInt(document.getElementById('prod-form-stock').value, 10),
      image_url: document.getElementById('prod-form-image').value.trim(),
      description: document.getElementById('prod-form-desc').value.trim()
    };

    try {
      if (editId) {
        await Api.put(`/merchants/products/${editId}`, payload);
        Toast.show('Produit mis à jour avec succès.');
      } else {
        await Api.post('/merchants/products', payload);
        Toast.show('Produit ajouté au catalogue avec succès.');
      }
      Modal.close('product-form-modal');
      MerchantPortal.loadProducts();
      Catalog.loadProducts();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  });

  // 8. Formulaire Validation Code OTP (Marchand)
  document.getElementById('validate-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('otp-order-id').value;
    const code = document.getElementById('otp-code-input').value.trim();
    await MerchantPortal.validateOtpCode(orderId, code);
  });

  // 9. Formulaire Litige (Client)
  document.getElementById('dispute-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('dispute-order-id').value;
    const reason = document.getElementById('dispute-reason').value;
    const description = document.getElementById('dispute-desc').value.trim();

    try {
      const res = await Api.post(`/orders/${orderId}/dispute`, { reason, description });
      if (res.success) {
        Modal.close('dispute-modal');
        Toast.show('Litige enregistré. Les fonds sont gelés et notre équipe intervient.', 'warning');
        ClientPortal.loadOrders();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  });

  // 10. Boutons d'actualisation & Onglets Portails
  document.getElementById('client-refresh-orders-btn')?.addEventListener('click', () => ClientPortal.loadOrders());
  document.getElementById('merchant-refresh-btn')?.addEventListener('click', () => {
    MerchantPortal.loadStats();
    MerchantPortal.loadProducts();
    MerchantPortal.loadOrders();
  });
  document.getElementById('merchant-add-product-btn')?.addEventListener('click', () => MerchantPortal.openAddProductModal());
  document.getElementById('merchant-new-prod-btn-2')?.addEventListener('click', () => MerchantPortal.openAddProductModal());

  document.querySelectorAll('.portal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.portal-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');

      document.querySelectorAll('.portal-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(tabTarget);
      if (targetContent) targetContent.style.display = 'block';
    });
  });

  document.getElementById('activate-trial-btn')?.addEventListener('click', () => {
    if (AppState.user) {
      Toast.show('Votre Pass MoneyLink Premium est déjà actif avec 30 jours d’essai offerts !', 'info');
    } else {
      Modal.open('auth-modal');
      const clientTab = document.querySelector('[data-auth-tab="register-client-tab"]');
      if (clientTab) clientTab.click();
    }
  });

  document.getElementById('conf-return-catalog-btn')?.addEventListener('click', () => {
    Modal.close('order-confirmation-modal');
    document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// ============================================================================
// 13. UTILITAIRES & FONCTIONS AUXILIAIRES
// ============================================================================
async function initApiStatusCheck() {
  const statusDot = document.getElementById('api-status-dot');
  const statusText = document.getElementById('api-status-text');
  const statusLink = document.getElementById('api-status-link');

  if (statusLink) statusLink.href = `${API_BASE_URL}/api/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      if (statusDot) statusDot.style.background = '#10B981';
      if (statusText) statusText.textContent = 'API Opérationnelle (PostgreSQL)';
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    if (statusDot) statusDot.style.background = '#F59E0B';
    if (statusText) statusText.textContent = 'API Backend Status';
  }
}

function initEscrowCalculator() {
  const amountInput = document.getElementById('calc-amount');
  const feeDisplay = document.getElementById('calc-fee');
  const netDisplay = document.getElementById('calc-net');
  if (!amountInput || !feeDisplay || !netDisplay) return;

  function updateCalculation() {
    const rawVal = amountInput.value.replace(/\s+/g, '');
    const amount = parseFloat(rawVal) || 0;
    const fee = Math.round(amount * 0.01);
    const net = Math.max(0, amount - fee);

    feeDisplay.textContent = formatFCFA(fee);
    netDisplay.textContent = formatFCFA(net);
  }

  amountInput.addEventListener('input', updateCalculation);
  updateCalculation();
}

function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('h3');
    if (question) {
      question.style.cursor = 'pointer';
      question.addEventListener('click', () => {
        item.classList.toggle('active');
      });
    }
  });
}

function formatFCFA(amount) {
  const val = parseFloat(amount) || 0;
  return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';
}

function formatOrderStatus(status) {
  const labels = {
    PENDING_PAYMENT: 'En attente de confirmation 💬',
    PAYMENT_CONFIRMED: 'Payé • Verrouillé en Séquestre 🔒',
    PROCESSING: 'En cours de préparation 📦',
    SHIPPED: 'Expédié • En cours de livraison 🚚',
    DELIVERED: 'Livré (En attente confirmation) 📬',
    CONFIRMED: 'Livraison Validée • Fonds Débloqués ✅',
    DISPUTED: 'Litige Ouvert • Fonds Gelés ⚠️',
    CANCELLED: 'Commande Annulée ❌',
    REFUNDED: 'Remboursé à l’acheteur ↩️'
  };
  return labels[status] || status;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * MoneyLink — Application Frontend Interactive & E-Commerce Séquestre
 * Connectée à l'API PostgreSQL en temps réel (Parcours Client & Marchand)
 */

// 1. Configuration de l'API Backend MoneyLink
const API_BASE_URL = window.MONEYLINK_API_URL || (
  (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5000'
    : 'https://moneylink-kd6v.onrender.com'
);

const DEFAULT_PRODUCT_PLACEHOLDER = 'assets/product-placeholder.svg';

/**
 * Résolution des URLs de médias et images (gère les URLs relatives /api/uploads/... vers le backend de production)
 */
function resolveImageUrl(url, fallback = DEFAULT_PRODUCT_PLACEHOLDER) {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback;
  const trimmed = url.trim();
  if (trimmed === 'null' || trimmed === 'undefined') return fallback;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  if (trimmed.startsWith('/')) {
    return `${cleanBase}${trimmed}`;
  }
  return `${cleanBase}/${trimmed}`;
}

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
// 2b. MODULE DE TRACKING ANALYTICS CLIENT (DONNÉES RÉELLES & RGPD)
// ============================================================================
const Tracker = {
  visitorId: null,
  sessionId: null,
  visitCount: 1,
  isNewVisitor: true,
  utmParams: {},
  referrer: '',

  init() {
    try {
      // 1. Visiteur Unique persistant
      let vid = localStorage.getItem('moneylink_vid');
      if (!vid) {
        vid = 'vid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('moneylink_vid', vid);
        this.isNewVisitor = true;
      } else {
        this.isNewVisitor = false;
      }
      this.visitorId = vid;

      // 2. Compteur de visites
      let visits = parseInt(localStorage.getItem('moneylink_visit_count') || '0', 10);
      visits++;
      localStorage.setItem('moneylink_visit_count', visits.toString());
      this.visitCount = visits;

      // 3. Session Unique avec expiration 30 minutes
      let sid = sessionStorage.getItem('moneylink_sid');
      let lastActivity = parseInt(sessionStorage.getItem('moneylink_last_act') || '0', 10);
      const now = Date.now();

      if (!sid || (lastActivity && now - lastActivity > 30 * 60 * 1000)) {
        sid = 'sess_' + now + '_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('moneylink_sid', sid);
      }
      sessionStorage.setItem('moneylink_last_act', now.toString());
      this.sessionId = sid;

      // 4. Extraction UTM & Referrer
      const urlParams = new URLSearchParams(window.location.search);
      this.utmParams = {
        utm_source: urlParams.get('utm_source') || '',
        utm_medium: urlParams.get('utm_medium') || '',
        utm_campaign: urlParams.get('utm_campaign') || '',
        utm_term: urlParams.get('utm_term') || '',
        utm_content: urlParams.get('utm_content') || ''
      };
      this.referrer = document.referrer || '';

      // 5. Page vue initiale
      this.pageView(window.location.pathname, document.title);

      // 6. Heartbeat toutes les 60s pour la détection des visiteurs actifs en direct
      setInterval(() => {
        this.heartbeat();
      }, 60000);

      // 7. Écouteurs de navigation et interactions globales
      window.addEventListener('focus', () => this.heartbeat());
      window.addEventListener('hashchange', () => {
        this.pageView(window.location.hash || window.location.pathname, document.title);
      });

      // Écouteur global pour les clics WhatsApp
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && (link.href.includes('wa.me') || link.href.includes('whatsapp.com') || link.id === 'conf-whatsapp-btn')) {
          this.whatsappClick({
            target_url: link.href,
            source: 'anchor_click'
          });
        }
      });
    } catch (e) {
      console.warn('[Analytics Tracker Init Error]', e.message);
    }
  },

  track(eventType, metadata = {}) {
    try {
      const now = Date.now();
      sessionStorage.setItem('moneylink_last_act', now.toString());

      const payload = {
        event_type: eventType,
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        platform: 'WEB_LANDING',
        page_url: window.location.pathname + window.location.hash,
        page_title: document.title,
        referrer: this.referrer,
        ...this.utmParams,
        user_id: AppState.user?.id || null,
        metadata: {
          ...metadata,
          is_new_visitor: this.isNewVisitor,
          visit_count: this.visitCount,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight
        }
      };

      const url = `${API_BASE_URL}/api/analytics/track`;
      const dataBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, dataBlob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[Analytics Track Error]', err.message);
    }
  },

  pageView(url, title) {
    this.track('PAGE_VIEW', { page_url: url, page_title: title });
  },

  productView(product) {
    if (!product) return;
    this.track('PRODUCT_VIEW', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.category,
      merchant_id: product.merchant_id,
      merchant_name: product.merchant_name
    });
  },

  search(query, resultsCount = 0) {
    this.track('SEARCH', { query, results_count: resultsCount });
  },

  addToCart(product, quantity = 1) {
    if (!product) return;
    this.track('ADD_TO_CART', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity,
      total: product.price * quantity,
      category: product.category
    });
  },

  removeFromCart(product) {
    if (!product) return;
    this.track('REMOVE_FROM_CART', {
      product_id: product.id,
      product_name: product.name,
      price: product.price
    });
  },

  whatsappClick(orderOrProduct = {}) {
    this.track('WHATSAPP_CLICK', {
      ...orderOrProduct
    });
  },

  register(user, role) {
    this.track('REGISTER', {
      user_id: user?.id,
      role: role || user?.role || 'CLIENT'
    });
  },

  login(user, role) {
    this.track('LOGIN', {
      user_id: user?.id,
      role: role || user?.role || 'CLIENT'
    });
  },

  orderCreated(order) {
    this.track('ORDER_CREATED', {
      order_id: order?.id,
      order_number: order?.order_number,
      total_amount: order?.total_amount,
      merchant_id: order?.merchant_id
    });
  },

  orderConfirmed(order) {
    this.track('ORDER_CONFIRMED', {
      order_id: order?.id,
      order_number: order?.order_number,
      total_amount: order?.total_amount
    });
  },

  heartbeat() {
    try {
      const url = `${API_BASE_URL}/api/analytics/heartbeat`;
      const payload = {
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        page_url: window.location.pathname + window.location.hash
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch (e) {}
  }
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

        Tracker.login(AppState.user, AppState.user.role);
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

        Tracker.register(AppState.user, 'CLIENT');
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

        Tracker.register(AppState.user, 'MERCHANT');
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
      MerchantPortal.loadProfile();
      MerchantPortal.loadProducts();
      MerchantPortal.loadOrders();
      BusinessModule.loadDashboard();
      InvoiceModule.loadMerchantInvoices();
    } else {
      ClientPortal.loadOrders();
      ClientPortal.loadProfile();
      AiModule.loadInsights();
      AiModule.loadConversations();
      ShieldModule.loadAlerts();
      InvoiceModule.loadClientInvoices();
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
        if (AppState.searchQuery.trim()) {
          Tracker.search(AppState.searchQuery.trim(), res.data.length);
        }
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
      const imageUrl = resolveImageUrl(p.image_url);

      return `
        <div class="product-card" data-product-id="${p.id}">
          <div class="product-image-wrap" onclick="Catalog.openDetail('${p.id}')">
            <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null; this.src='assets/product-placeholder.svg';" />
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

    Tracker.productView(product);
    AppState.selectedProductForDetail = product;
    const body = document.getElementById('product-detail-body');
    if (!body) return;

    const isOutOfStock = product.stock <= 0;
    const imageUrl = resolveImageUrl(product.image_url);

    body.innerHTML = `
      <div style="border-radius: var(--radius-md); overflow: hidden; height: 260px; background: #F1F5F9; margin-bottom: 20px;">
        <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(product.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='assets/product-placeholder.svg';" />
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

    Tracker.addToCart(product, quantity);
    this.save();
    this.updateUI();
    Toast.show(`"${product.name}" ajouté à votre panier ! 🛒`);
  },

  remove(productId) {
    const item = AppState.cart.find(i => i.product.id === productId);
    if (item) {
      Tracker.removeFromCart(item.product);
    }
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
      const imageUrl = resolveImageUrl(p.image_url);
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

      // Tracking Analytics réel de la commande et du clic WhatsApp
      Tracker.orderCreated(createdOrder);
      if (createdOrder.whatsapp_url) {
        Tracker.whatsappClick({
          order_id: createdOrder.id,
          order_number: createdOrder.order_number,
          total_amount: createdOrder.total_amount,
          merchant_id: createdOrder.merchant_id
        });
      }

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
          const shopNameEl = document.getElementById('merchant-shop-name');
          const cityEl = document.getElementById('merchant-city-display');
          const headerLogoEl = document.getElementById('merchant-header-logo');

          if (shopNameEl) shopNameEl.textContent = merchant.business_name || 'Boutique Pro';
          if (cityEl) cityEl.textContent = merchant.city || 'Dakar';
          if (headerLogoEl && merchant.logo_url) headerLogoEl.src = resolveImageUrl(merchant.logo_url);
        }

        if (metrics) {
          const productsEl = document.getElementById('merchant-kpi-products');
          const ordersEl = document.getElementById('merchant-kpi-orders');
          const volumeEl = document.getElementById('merchant-kpi-volume');
          const lowStockEl = document.getElementById('merchant-kpi-low-stock');

          if (productsEl) productsEl.textContent = (metrics.totalProducts || 0).toString();
          if (ordersEl) ordersEl.textContent = (metrics.totalOrders || 0).toString();
          if (volumeEl) volumeEl.textContent = formatFCFA(metrics.totalSalesVolumeFCFA || 0);
          if (lowStockEl) lowStockEl.textContent = (metrics.lowStockProducts || 0).toString();
        }

        if (wallet) {
          const availEl = document.getElementById('merchant-kpi-wallet-available');
          const lockEl = document.getElementById('merchant-kpi-wallet-locked');
          if (availEl) availEl.textContent = formatFCFA(wallet.available_balance || 0);
          if (lockEl) lockEl.textContent = formatFCFA(wallet.locked_balance || 0);
        }
      }
    } catch (err) {
      console.warn('Erreur KPIs marchand :', err.message);
    }
  },

  async loadProfile() {
    try {
      const res = await Api.get('/merchants/profile');
      if (res.success && res.data) {
        const { user, merchant } = res.data;

        if (user) {
          const fname = document.getElementById('merchant-prof-fname');
          const lname = document.getElementById('merchant-prof-lname');
          const phone = document.getElementById('merchant-prof-phone');
          if (fname) fname.value = user.first_name || '';
          if (lname) lname.value = user.last_name || '';
          if (phone) phone.value = user.phone || '';
        }

        if (merchant) {
          const bizname = document.getElementById('merchant-prof-bizname');
          const biztype = document.getElementById('merchant-prof-biztype');
          const desc = document.getElementById('merchant-prof-desc');
          const addr = document.getElementById('merchant-prof-address');
          const quart = document.getElementById('merchant-prof-quartier');
          const city = document.getElementById('merchant-prof-city');
          const country = document.getElementById('merchant-prof-country');
          const whatsapp = document.getElementById('merchant-prof-whatsapp');
          const logoUrl = document.getElementById('merchant-prof-logo-url');
          const logoPreview = document.getElementById('merchant-profile-logo-preview');
          const removeLogoBtn = document.getElementById('merchant-remove-logo-btn');

          if (bizname) bizname.value = merchant.business_name || '';
          if (biztype) biztype.value = merchant.business_type || 'Commerce Général';
          if (desc) desc.value = merchant.description || '';
          if (addr) addr.value = merchant.address || '';
          if (quart) quart.value = merchant.quartier || '';
          if (city) city.value = merchant.city || 'Dakar';
          if (country) country.value = merchant.country || 'Sénégal';
          if (whatsapp) whatsapp.value = merchant.whatsapp_phone || merchant.phone || '';
          if (logoUrl) logoUrl.value = merchant.logo_url || '';

          if (logoPreview && merchant.logo_url) {
            logoPreview.src = resolveImageUrl(merchant.logo_url);
            if (removeLogoBtn) removeLogoBtn.style.display = 'inline-flex';
          }
        }
      }
    } catch (err) {
      console.warn('Erreur chargement profil marchand :', err.message);
    }
  },

  async saveProfile(payload) {
    const saveBtn = document.getElementById('merchant-save-profile-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '💾 Enregistrement...';
    }

    try {
      const res = await Api.put('/merchants/profile', payload);
      if (res.success && res.data) {
        Toast.show('Profil marchand mis à jour avec succès ! ✅');
        if (res.data.merchant) {
          if (AppState.user) {
            AppState.user.merchant = res.data.merchant;
            if (res.data.user) {
              AppState.user.first_name = res.data.user.first_name;
              AppState.user.last_name = res.data.user.last_name;
            }
            localStorage.setItem('moneylink_user', JSON.stringify(AppState.user));
          }
        }
        this.loadStats();
        Auth.updateUI();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Enregistrer mon profil';
      }
    }
  },

  async handleLogoUpload(file) {
    if (!file) return;

    // Validation côté client (taille et format)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      Toast.show('Format invalide. Formats acceptés : JPG, PNG, WEBP.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Toast.show('Image trop volumineuse. Limite max: 5 Mo.', 'error');
      return;
    }

    try {
      Toast.show('Téléversement du logo en cours...', 'info');
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        try {
          const res = await Api.post('/upload', {
            data_base64: base64Data,
            filename: file.name,
            mime_type: file.type
          });

          if (res.success && res.data) {
            const uploadedUrl = res.data.url;
            const logoInput = document.getElementById('merchant-prof-logo-url');
            const logoPreview = document.getElementById('merchant-profile-logo-preview');
            const headerLogo = document.getElementById('merchant-header-logo');
            const removeBtn = document.getElementById('merchant-remove-logo-btn');

            if (logoInput) logoInput.value = uploadedUrl;
            if (logoPreview) logoPreview.src = resolveImageUrl(uploadedUrl);
            if (headerLogo) headerLogo.src = resolveImageUrl(uploadedUrl);
            if (removeBtn) removeBtn.style.display = 'inline-flex';

            Toast.show('Logo téléversé avec succès ! Cliquez sur Enregistrer pour confirmer.');
          }
        } catch (uploadErr) {
          Toast.show(`Échec du téléversement : ${uploadErr.message}`, 'error');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  removeLogo() {
    const logoInput = document.getElementById('merchant-prof-logo-url');
    const logoPreview = document.getElementById('merchant-profile-logo-preview');
    const removeBtn = document.getElementById('merchant-remove-logo-btn');
    const fileInput = document.getElementById('merchant-logo-file-input');

    if (logoInput) logoInput.value = '';
    if (logoPreview) logoPreview.src = 'assets/moneylink_logo_mark.svg';
    if (removeBtn) removeBtn.style.display = 'none';
    if (fileInput) fileInput.value = '';
    Toast.show('Logo retiré. Cliquez sur Enregistrer pour confirmer.', 'info');
  },

  async handleProductImageUpload(file) {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      Toast.show('Format d’image invalide. Formats acceptés : JPG, PNG, WEBP.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Toast.show('Image trop volumineuse. Limite max: 5 Mo.', 'error');
      return;
    }

    try {
      Toast.show('Téléversement de la photo en cours...', 'info');
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        try {
          const res = await Api.post('/upload', {
            data_base64: base64Data,
            filename: file.name,
            mime_type: file.type
          });

          if (res.success && res.data) {
            const uploadedUrl = res.data.url;
            const imgInput = document.getElementById('prod-form-image');
            const imgPreview = document.getElementById('prod-form-image-preview');
            const removeBtn = document.getElementById('prod-form-remove-img-btn');

            if (imgInput) imgInput.value = uploadedUrl;
            if (imgPreview) imgPreview.src = resolveImageUrl(uploadedUrl);
            if (removeBtn) removeBtn.style.display = 'inline-flex';

            Toast.show('Photo du produit téléversée avec succès !');
          }
        } catch (uploadErr) {
          Toast.show(`Échec du téléversement : ${uploadErr.message}`, 'error');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  removeProductImage() {
    const imgInput = document.getElementById('prod-form-image');
    const imgPreview = document.getElementById('prod-form-image-preview');
    const removeBtn = document.getElementById('prod-form-remove-img-btn');
    const fileInput = document.getElementById('prod-form-file-input');

    if (imgInput) imgInput.value = '';
    if (imgPreview) imgPreview.src = DEFAULT_PRODUCT_PLACEHOLDER;
    if (removeBtn) removeBtn.style.display = 'none';
    if (fileInput) fileInput.value = '';
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
              <div style="font-size: 36px; margin-bottom: 8px;">📦</div>
              <h4 style="color: var(--secondary); font-size: 16px;">Vous n'avez pas encore ajouté de produit à votre boutique.</h4>
              <p style="font-size: 13.5px; margin-top: 4px;">Publiez vos premiers articles pour commencer à recevoir des commandes sécurisées.</p>
              <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="MerchantPortal.openAddProductModal()">
                ➕ Ajouter mon premier produit
              </button>
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <div style="overflow-x: auto;">
            <table class="merchant-products-table">
              <thead>
                <tr>
                  <th>Photo &amp; Article</th>
                  <th>Catégorie</th>
                  <th>Prix (FCFA)</th>
                  <th>Stock</th>
                  <th>Lieu</th>
                  <th>Statut</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(p => {
                  const isLowStock = p.stock <= 3;
                  const isOut = p.stock === 0;
                  const statusLabel = p.is_active ? 'ACTIF' : 'INACTIF';
                  const statusBadgeClass = p.is_active ? 'CONFIRMED' : 'DISPUTED';

                  return `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <img src="${escapeHTML(resolveImageUrl(p.image_url))}" alt="${escapeHTML(p.name)}" style="width: 46px; height: 46px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border);" onerror="this.onerror=null; this.src='assets/product-placeholder.svg';" />
                          <div>
                            <strong style="color: var(--secondary); font-size: 14px;">${escapeHTML(p.name)}</strong>
                            ${p.subcategory ? `<div style="font-size: 11.5px; color: var(--text-muted);">${escapeHTML(p.subcategory)}</div>` : ''}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="product-category-tag" style="position: static; display: inline-block;">${escapeHTML(p.category || 'Général')}</span>
                      </td>
                      <td>
                        <strong style="color: var(--secondary); font-size: 14.5px;">${formatFCFA(p.price)}</strong>
                      </td>
                      <td>
                        <div class="stock-stepper">
                          <button type="button" class="stock-stepper-btn" onclick="MerchantPortal.adjustStock('${p.id}', ${Math.max(0, p.stock - 1)})" title="Diminuer le stock">-</button>
                          <span class="stock-stepper-val" style="${isLowStock ? 'color: #D97706;' : ''}">${p.stock}</span>
                          <button type="button" class="stock-stepper-btn" onclick="MerchantPortal.adjustStock('${p.id}', ${p.stock + 1})" title="Augmenter le stock">+</button>
                        </div>
                        ${isOut ? '<div style="font-size: 10.5px; color: #EF4444; font-weight: 700; margin-top: 2px;">Rupture</div>' : (isLowStock ? '<div style="font-size: 10.5px; color: #D97706; font-weight: 700; margin-top: 2px;">Stock faible</div>' : '')}
                      </td>
                      <td>
                        <div style="font-size: 12.5px; color: var(--text-main);">📍 ${escapeHTML(p.city || 'Dakar')}</div>
                        ${p.quartier ? `<div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(p.quartier)}</div>` : ''}
                      </td>
                      <td>
                        <span class="order-badge ${statusBadgeClass}">
                          ${statusLabel}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px;">
                          <button class="btn btn-outline btn-sm" style="padding: 5px 9px;" onclick="MerchantPortal.openEditProductModal('${p.id}')" title="Modifier le produit">
                            ✏️
                          </button>
                          <button class="btn btn-outline btn-sm" style="padding: 5px 9px; ${p.is_active ? 'color: #D97706; border-color: #FCD34D;' : 'color: #059669; border-color: #6EE7B7;'}" onclick="MerchantPortal.toggleProductStatus('${p.id}', ${p.is_active})" title="${p.is_active ? 'Désactiver' : 'Activer'}">
                            ${p.is_active ? '👁️' : '🔒'}
                          </button>
                          <button class="btn btn-outline btn-sm" style="padding: 5px 9px; color: #EF4444; border-color: #FCA5A5;" onclick="MerchantPortal.deleteProduct('${p.id}')" title="Supprimer du catalogue">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
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

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px;">
                <div style="font-size: 15px; font-weight: 800; color: var(--primary-dark);">
                  Total Vente : ${formatFCFA(ord.total_amount)}
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  ${ord.whatsapp_url ? `
                    <a href="${ord.whatsapp_url}" target="_blank" rel="noopener" class="btn btn-sm" style="background: #25D366; color: #FFFFFF; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                      <span>💬</span> WhatsApp
                    </a>
                  ` : ''}

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
        this.loadStats();
        Catalog.loadProducts(); // Sync catalogue public
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async toggleProductStatus(productId, currentActive) {
    try {
      const newActive = !currentActive;
      const res = await Api.patch(`/merchants/products/${productId}/status`, { is_active: newActive });
      if (res.success) {
        Toast.show(newActive ? 'Produit activé et visible.' : 'Produit désactivé.');
        this.loadProducts();
        this.loadStats();
        Catalog.loadProducts();
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

    document.getElementById('prod-form-image').value = '';
    document.getElementById('prod-form-image-preview').src = DEFAULT_PRODUCT_PLACEHOLDER;
    document.getElementById('prod-form-remove-img-btn').style.display = 'none';
    document.getElementById('prod-form-price-preview').textContent = '0 FCFA';

    // Remplir ville & quartier par défaut depuis le profil marchand
    if (AppState.user?.merchant) {
      if (document.getElementById('prod-form-city')) {
        document.getElementById('prod-form-city').value = AppState.user.merchant.city || 'Dakar';
      }
      if (document.getElementById('prod-form-quartier')) {
        document.getElementById('prod-form-quartier').value = AppState.user.merchant.quartier || '';
      }
    }

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
    document.getElementById('prod-form-subcategory').value = product.subcategory || '';
    document.getElementById('prod-form-price').value = product.price;
    document.getElementById('prod-form-price-preview').textContent = formatFCFA(product.price);
    document.getElementById('prod-form-stock').value = product.stock;
    document.getElementById('prod-form-city').value = product.city || 'Dakar';
    document.getElementById('prod-form-quartier').value = product.quartier || '';
    document.getElementById('prod-form-image').value = product.image_url || '';
    document.getElementById('prod-form-image-preview').src = resolveImageUrl(product.image_url);
    document.getElementById('prod-form-remove-img-btn').style.display = product.image_url ? 'inline-flex' : 'none';
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
        this.loadStats();
        Catalog.loadProducts();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};

// ============================================================================
// 10b. MODULE MONEYLINK IA (ASSISTANT & CONSEILLER FINANCIER INTELLIGENT)
// ============================================================================
const AiModule = {
  async loadInsights() {
    try {
      const lang = window.I18n ? window.I18n.currentLang : 'fr';
      const res = await Api.get(`/ai/insights?lang=${lang}`);
      if (res.success && res.data) {
        const { summary, mainAdvice, tips, alerts } = res.data;
        const weekEl = document.getElementById('ai-kpi-spent-week');
        const monthEl = document.getElementById('ai-kpi-spent-month');
        const saveEl = document.getElementById('ai-kpi-savings-capacity');
        const tipsContainer = document.getElementById('ai-tips-container');

        if (weekEl) weekEl.textContent = formatFCFA(summary.spentThisWeek || 0);
        if (monthEl) monthEl.textContent = formatFCFA(summary.spentThisMonth || 0);
        if (saveEl) saveEl.textContent = formatFCFA(summary.estimatedSavingsCapacity || 0);

        if (tipsContainer) {
          const allNotices = [...(alerts || []), ...(tips || [])];
          if (allNotices.length > 0) {
            tipsContainer.innerHTML = allNotices.map(n => `
              <div class="shield-alert-card ${n.type === 'WARNING' ? 'high' : ''}" style="margin-bottom: 8px; padding: 12px 16px;">
                <div style="font-size: 13.5px; color: var(--text-main);">
                  <strong>${escapeHTML(n.title)}</strong> : ${escapeHTML(n.message)}
                </div>
              </div>
            `).join('');
          } else {
            tipsContainer.innerHTML = `
              <div style="background: rgba(0, 168, 107, 0.08); border: 1px solid rgba(0, 168, 107, 0.2); border-radius: var(--radius-sm); padding: 12px 16px; font-size: 13.5px; color: var(--primary-dark);">
                💡 ${escapeHTML(mainAdvice)}
              </div>
            `;
          }
        }
      }
    } catch (err) {
      console.warn('Erreur chargement insights IA :', err.message);
    }
  },

  async loadConversations() {
    const list = document.getElementById('ai-messages-list');
    if (!list) return;

    try {
      const res = await Api.get('/ai/conversations?limit=30');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        list.innerHTML = res.data.map(msg => `
          <div class="ai-message ${msg.role === 'USER' ? 'user' : 'assistant'}">
            ${msg.role === 'ASSISTANT' ? '🤖 ' : ''}${escapeHTML(msg.message)}
          </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
      }
    } catch (err) {
      console.warn('Erreur historique IA :', err.message);
    }
  },

  async loadMerchantConversations() {
    const list = document.getElementById('merchant-ai-messages');
    if (!list) return;

    try {
      const res = await Api.get('/ai/conversations?limit=30');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        list.innerHTML = res.data.map(msg => `
          <div class="ai-message ${msg.role === 'USER' ? 'user' : 'assistant'}">
            ${msg.role === 'ASSISTANT' ? '🤖 ' : ''}${escapeHTML(msg.message)}
          </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
      }
    } catch (err) {
      console.warn('Erreur historique IA Marchand :', err.message);
    }
  },

  async askQuestion(question, isMerchant = false) {
    if (!question || !question.trim()) return;

    const list = isMerchant
      ? document.getElementById('merchant-ai-messages')
      : document.getElementById('ai-messages-list');

    if (list) {
      const userDiv = document.createElement('div');
      userDiv.className = 'ai-message user';
      userDiv.textContent = question;
      list.appendChild(userDiv);

      const botDiv = document.createElement('div');
      botDiv.className = 'ai-message assistant';
      botDiv.innerHTML = '🤖 <em>Analyse de vos données réelles en cours...</em>';
      list.appendChild(botDiv);
      list.scrollTop = list.scrollHeight;

      try {
        const lang = window.I18n ? window.I18n.currentLang : 'fr';
        const res = await Api.post('/ai/chat', { message: question, language: lang });
        if (res.success && res.data) {
          botDiv.innerHTML = `🤖 ${escapeHTML(res.data.response)}`;
          if (res.data.summary) {
            const weekEl = document.getElementById('ai-kpi-spent-week');
            const monthEl = document.getElementById('ai-kpi-spent-month');
            const saveEl = document.getElementById('ai-kpi-savings-capacity');
            if (weekEl) weekEl.textContent = formatFCFA(res.data.summary.spentThisWeek || 0);
            if (monthEl) monthEl.textContent = formatFCFA(res.data.summary.spentThisMonth || 0);
            if (saveEl) saveEl.textContent = formatFCFA(res.data.summary.estimatedSavingsCapacity || 0);
          }
        } else {
          botDiv.textContent = 'Désolé, une erreur est survenue lors de l\'analyse.';
        }
      } catch (err) {
        botDiv.textContent = `Erreur : ${err.message}`;
      }
      list.scrollTop = list.scrollHeight;
    }
  },

  init() {
    document.getElementById('ai-chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('ai-chat-input');
      if (input && input.value.trim()) {
        const q = input.value.trim();
        input.value = '';
        this.askQuestion(q, false);
      }
    });

    document.getElementById('merchant-ai-chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('merchant-ai-input');
      if (input && input.value.trim()) {
        const q = input.value.trim();
        input.value = '';
        this.askQuestion(q, true);
      }
    });

    document.querySelectorAll('[data-ai-prompt]').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-ai-prompt');
        if (prompt) this.askQuestion(prompt, false);
      });
    });

    document.querySelectorAll('[data-merchant-ai-prompt]').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-merchant-ai-prompt');
        if (prompt) this.askQuestion(prompt, true);
      });
    });
  }
};

// ============================================================================
// 10c. MODULE MONEYLINK SHIELD (SÉCURITÉ & SCORING EXPLICABLE)
// ============================================================================
const ShieldModule = {
  pendingDecisionAlertId: null,

  async loadAlerts() {
    const list = document.getElementById('client-shield-alerts-list');
    if (!list) return;

    try {
      const res = await Api.get('/security/alerts');
      if (res.success && Array.isArray(res.data)) {
        if (res.data.length === 0) {
          list.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
              🛡️ Aucune alerte de sécurité suspecte détectée. Vos opérations sont 100% sécurisées.
            </div>
          `;
          return;
        }

        list.innerHTML = res.data.map(alert => `
          <div class="shield-alert-card ${alert.risk_level === 'HIGH' ? 'high' : ''}">
            <div>
              <div style="font-weight: 700; color: var(--secondary); font-size: 14px;">
                ${escapeHTML(alert.title)}
              </div>
              <div style="font-size: 13px; color: var(--text-main); margin-top: 4px;">
                ${escapeHTML(alert.message)}
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">
                Score de risque : <strong>${alert.risk_score}/100</strong> (${escapeHTML(alert.risk_level)}) • ${new Date(alert.created_at).toLocaleString('fr-FR')}
              </div>
            </div>
            <div>
              ${!alert.is_acknowledged ? `
                <button class="btn btn-primary btn-sm" onclick="ShieldModule.confirmAlert('${alert.id}', 'CONFIRMED')">
                  Confirmer
                </button>
              ` : `
                <span class="order-badge CONFIRMED" style="font-size: 11px;">Traitée</span>
              `}
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.warn('Erreur alertes Shield :', err.message);
    }
  },

  async analyzeBeforeAction({ amount, recipient_id, payment_method, transaction_type }) {
    try {
      const res = await Api.post('/security/analyze', {
        amount,
        recipient_id,
        payment_method,
        transaction_type
      });

      if (res.success && res.data) {
        const analysis = res.data;
        if (analysis.requiresConfirmation) {
          return new Promise((resolve) => {
            this.showRiskModal(analysis, resolve);
          });
        }
      }
      return true;
    } catch (err) {
      console.warn('Vérification Shield skip (non-bloquant) :', err.message);
      return true;
    }
  },

  showRiskModal(analysis, callback) {
    this.pendingDecisionAlertId = analysis.alertId;
    const scoreEl = document.getElementById('shield-modal-score');
    const barEl = document.getElementById('shield-modal-bar');
    const reasonsEl = document.getElementById('shield-modal-reasons');
    const descEl = document.getElementById('shield-modal-desc');

    if (scoreEl) scoreEl.textContent = `${analysis.riskScore} / 100`;
    if (barEl) {
      barEl.style.width = `${analysis.riskScore}%`;
      barEl.className = `shield-risk-fill ${analysis.riskLevel.toLowerCase()}`;
    }
    if (descEl && analysis.explanationSummary) {
      descEl.textContent = analysis.explanationSummary;
    }

    if (reasonsEl) {
      const items = (analysis.factors && analysis.factors.length > 0)
        ? analysis.factors.map(f => `• <strong>${escapeHTML(f.label)}</strong> : ${escapeHTML(f.detail)}`)
        : (analysis.warnings || []).map(w => `• ${escapeHTML(w)}`);
      reasonsEl.innerHTML = items.join('<br/>') || '• Opération inhabituelle nécessitant une confirmation explicite.';
    }

    const confirmBtn = document.getElementById('shield-btn-confirm');
    const cancelBtn = document.getElementById('shield-btn-cancel');

    const handleConfirm = async () => {
      Modal.close('shield-confirm-modal');
      if (this.pendingDecisionAlertId) {
        await this.confirmAlert(this.pendingDecisionAlertId, 'CONFIRMED');
      }
      cleanup();
      callback(true);
    };

    const handleCancel = async () => {
      Modal.close('shield-confirm-modal');
      if (this.pendingDecisionAlertId) {
        await this.confirmAlert(this.pendingDecisionAlertId, 'CANCELLED');
      }
      cleanup();
      callback(false);
    };

    const cleanup = () => {
      confirmBtn?.removeEventListener('click', handleConfirm);
      cancelBtn?.removeEventListener('click', handleCancel);
    };

    confirmBtn?.addEventListener('click', handleConfirm);
    cancelBtn?.addEventListener('click', handleCancel);

    Modal.open('shield-confirm-modal');
  },

  async confirmAlert(alertId, decision = 'CONFIRMED') {
    try {
      const res = await Api.post('/security/confirm', { alert_id: alertId, decision });
      if (res.success) {
        Toast.show(res.message || 'Opération confirmée.');
        this.loadAlerts();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  init() {
    // Shield initialisation
  }
};

// ============================================================================
// 10d. MODULE MONEYLINK BUSINESS (TABLEAU DE BORD & ANALYTICS MARCHAND)
// ============================================================================
const BusinessModule = {
  async loadDashboard() {
    try {
      const res = await Api.get('/business/dashboard');
      if (res.success && res.data) {
        const { revenue, performance, aiAnalysis } = res.data;

        const todayEl = document.getElementById('biz-kpi-today');
        const weekEl = document.getElementById('biz-kpi-week');
        const monthEl = document.getElementById('biz-kpi-month');
        const avgEl = document.getElementById('biz-kpi-avg');
        const bestDayEl = document.getElementById('biz-kpi-best-day');
        const loyalEl = document.getElementById('biz-kpi-loyal');
        const aiBox = document.getElementById('biz-ai-analysis-content');

        if (todayEl) todayEl.textContent = formatFCFA(revenue.today || 0);
        if (weekEl) weekEl.textContent = formatFCFA(revenue.week || 0);
        if (monthEl) monthEl.textContent = formatFCFA(revenue.month || 0);
        if (avgEl) avgEl.textContent = formatFCFA(performance.avgOrderValue || 0);
        if (bestDayEl) bestDayEl.textContent = performance.bestDay || 'Samedi';
        if (loyalEl) loyalEl.textContent = (performance.recurrentCustomersCount || 0).toString();

        if (aiBox && Array.isArray(aiAnalysis)) {
          aiBox.innerHTML = aiAnalysis.map(pt => `<div style="margin-bottom: 6px;">${escapeHTML(pt)}</div>`).join('');
        }
      }
    } catch (err) {
      console.warn('Erreur Dashboard Business :', err.message);
    }
  }
};

// ============================================================================
// 10e. MODULE FACTURES & REÇUS NUMÉRIQUES
// ============================================================================
const InvoiceModule = {
  async loadMerchantInvoices() {
    const container = document.getElementById('merchant-invoices-table-container');
    if (!container) return;

    try {
      const res = await Api.get('/invoices');
      if (res.success && Array.isArray(res.data)) {
        const invoices = res.data;
        if (invoices.length === 0) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--surface-alt); border-radius: var(--radius-md);">
              <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
              <h4 style="color: var(--secondary); font-size: 16px;">Vous n'avez pas encore émis de facture.</h4>
              <p style="font-size: 13.5px; margin-top: 4px;">Créez une facture professionnelle et partagez-la à vos clients sur WhatsApp.</p>
              <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="InvoiceModule.openCreateModal()">
                ➕ Créer ma première facture
              </button>
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <div style="overflow-x: auto;">
            <table class="merchant-products-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Date</th>
                  <th>Montant Total</th>
                  <th>Statut</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(inv => {
                  const statusClass = inv.status === 'PAYÉE' ? 'inv-status-paid' : (inv.status === 'ENVOYÉE' ? 'inv-status-sent' : 'inv-status-draft');
                  return `
                    <tr>
                      <td><strong>${escapeHTML(inv.invoice_number)}</strong></td>
                      <td>${escapeHTML(inv.client_name)}</td>
                      <td>${escapeHTML(inv.client_phone)}</td>
                      <td>${new Date(inv.created_at).toLocaleDateString('fr-FR')}</td>
                      <td><strong style="color: var(--primary);">${formatFCFA(inv.total_amount)}</strong></td>
                      <td><span class="invoice-badge-status ${statusClass}">${escapeHTML(inv.status)}</span></td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px;">
                          <button class="btn btn-outline btn-sm" style="background: #25D366; color: #FFFFFF; border-color: #25D366; padding: 4px 8px;" onclick="InvoiceModule.sendInvoice('${inv.id}')" title="Partager sur WhatsApp">
                            💬
                          </button>
                          ${inv.status === 'PAYÉE' ? `
                            <button class="btn btn-primary btn-sm" style="padding: 4px 8px;" onclick="InvoiceModule.showReceipt('${inv.id}')" title="Voir Reçu Officiel">
                              🧾 Reçu
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div style="color: #EF4444; padding: 20px;">Erreur chargement factures : ${escapeHTML(err.message)}</div>`;
    }
  },

  async loadClientInvoices() {
    const container = document.getElementById('client-invoices-list');
    if (!container) return;

    try {
      const res = await Api.get('/invoices');
      if (res.success && Array.isArray(res.data)) {
        const invoices = res.data;
        if (invoices.length === 0) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--surface-alt); border-radius: var(--radius-md);">
              <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
              <p>Aucune facture reçue pour le moment.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = invoices.map(inv => `
          <div class="order-card">
            <div class="order-card-header">
              <div>
                <span class="order-num">Facture #${escapeHTML(inv.invoice_number)}</span>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                  Émise le ${new Date(inv.created_at).toLocaleDateString('fr-FR')}${inv.due_date ? ` • Échéance : ${new Date(inv.due_date).toLocaleDateString('fr-FR')}` : ''}
                </div>
              </div>
              <span class="invoice-badge-status ${inv.status === 'PAYÉE' ? 'inv-status-paid' : 'inv-status-sent'}">${escapeHTML(inv.status)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border);">
              <div style="font-size: 16px; font-weight: 800; color: var(--primary);">
                Total : ${formatFCFA(inv.total_amount)}
              </div>
              <div style="display: flex; gap: 8px;">
                ${inv.status !== 'PAYÉE' ? `
                  <button class="btn btn-primary btn-sm" onclick="InvoiceModule.payInvoice('${inv.id}')">
                    💳 Payer en Ligne (Wave / OM)
                  </button>
                ` : `
                  <button class="btn btn-primary btn-sm" onclick="InvoiceModule.showReceipt('${inv.id}')">
                    🧾 Voir le Reçu Officiel
                  </button>
                `}
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      container.innerHTML = `<div style="color: #EF4444; padding: 20px;">Erreur chargement factures client : ${escapeHTML(err.message)}</div>`;
    }
  },

  openCreateModal() {
    document.getElementById('create-invoice-form')?.reset();
    const container = document.getElementById('inv-items-container');
    if (container) {
      container.innerHTML = `
        <div class="inv-item-row" style="display: grid; grid-template-columns: 3fr 1fr 2fr auto; gap: 8px; align-items: center;">
          <input type="text" class="form-input inv-item-desc" placeholder="Désignation" required />
          <input type="number" class="form-input inv-item-qty" placeholder="Qté" value="1" min="1" required />
          <input type="number" class="form-input inv-item-price" placeholder="Prix (FCFA)" min="0" required />
          <span class="inv-item-total" style="font-weight: 700; font-size: 13px; color: var(--primary);">0 F</span>
        </div>
      `;
    }
    this.updateTotals();
    Modal.open('invoice-form-modal');
  },

  addItemRow() {
    const container = document.getElementById('inv-items-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'inv-item-row';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '3fr 1fr 2fr auto';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <input type="text" class="form-input inv-item-desc" placeholder="Désignation" required />
      <input type="number" class="form-input inv-item-qty" placeholder="Qté" value="1" min="1" required />
      <input type="number" class="form-input inv-item-price" placeholder="Prix (FCFA)" min="0" required />
      <button type="button" style="background: none; border: none; color: #EF4444; cursor: pointer; font-size: 14px;" title="Supprimer la ligne">🗑️</button>
    `;

    row.querySelector('button')?.addEventListener('click', () => {
      row.remove();
      this.updateTotals();
    });

    container.appendChild(row);
    this.bindRowInputs(row);
  },

  bindRowInputs(row) {
    row.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => this.updateTotals());
    });
  },

  updateTotals() {
    let subtotal = 0;
    document.querySelectorAll('#inv-items-container .inv-item-row').forEach(row => {
      const qty = parseFloat(row.querySelector('.inv-item-qty')?.value) || 0;
      const price = parseFloat(row.querySelector('.inv-item-price')?.value) || 0;
      const rowTotal = qty * price;
      subtotal += rowTotal;

      const rowTotalSpan = row.querySelector('.inv-item-total');
      if (rowTotalSpan) rowTotalSpan.textContent = formatFCFA(rowTotal);
    });

    const discount = parseFloat(document.getElementById('inv-discount')?.value) || 0;
    const total = Math.max(0, subtotal - discount);

    const totalPreview = document.getElementById('inv-total-preview');
    if (totalPreview) totalPreview.textContent = formatFCFA(total);
  },

  async submitInvoice() {
    const clientName = document.getElementById('inv-client-name')?.value.trim();
    const clientPhone = document.getElementById('inv-client-phone')?.value.trim();
    const clientEmail = document.getElementById('inv-client-email')?.value.trim();
    const dueDate = document.getElementById('inv-due-date')?.value;
    const clientAddress = document.getElementById('inv-client-address')?.value.trim();
    const discountAmount = parseFloat(document.getElementById('inv-discount')?.value) || 0;
    const notes = document.getElementById('inv-notes')?.value.trim();

    const items = [];
    document.querySelectorAll('#inv-items-container .inv-item-row').forEach(row => {
      const desc = row.querySelector('.inv-item-desc')?.value.trim();
      const qty = parseInt(row.querySelector('.inv-item-qty')?.value || '1', 10);
      const price = parseFloat(row.querySelector('.inv-item-price')?.value || '0');
      if (desc && qty > 0 && price >= 0) {
        items.push({ description: desc, quantity: qty, unit_price: price });
      }
    });

    if (!clientName || !clientPhone) {
      Toast.show('Nom et téléphone du client obligatoires.', 'error');
      return;
    }

    if (items.length === 0) {
      Toast.show('Veuillez ajouter au moins une ligne d\'article.', 'error');
      return;
    }

    try {
      const res = await Api.post('/invoices', {
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        client_address: clientAddress,
        due_date: dueDate,
        discount_amount: discountAmount,
        notes,
        items
      });

      if (res.success && res.data) {
        Toast.show(`Facture #${res.data.invoice_number} générée avec succès ! 🧾`, 'success');
        Modal.close('invoice-form-modal');
        this.loadMerchantInvoices();
        BusinessModule.loadDashboard();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async sendInvoice(invoiceId) {
    try {
      const res = await Api.post(`/invoices/${invoiceId}/send`);
      if (res.success && res.data) {
        if (res.data.whatsappLink) {
          window.open(res.data.whatsappLink, '_blank');
        }
        Toast.show('Facture marquée comme envoyée. WhatsApp ouvert.', 'info');
        this.loadMerchantInvoices();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async payInvoice(invoiceId) {
    if (!confirm('Voulez-vous régler cette facture via Wave / Orange Money ?')) return;
    try {
      const res = await Api.post(`/invoices/${invoiceId}/pay`, { payment_method: 'WAVE' });
      if (res.success && res.data) {
        Toast.show('Facture réglée avec succès ! Reçu officiel généré.', 'success');
        this.loadClientInvoices();
        if (res.data.receipt) {
          this.renderReceipt(res.data.receipt);
          Modal.open('receipt-modal');
        }
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async showReceipt(receiptOrInvoiceId) {
    try {
      const res = await Api.get(`/receipts/${receiptOrInvoiceId}`);
      if (res.success && res.data) {
        this.renderReceipt(res.data);
        Modal.open('receipt-modal');
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  renderReceipt(receipt) {
    const numEl = document.getElementById('rec-number-display');
    const dateEl = document.getElementById('rec-date-display');
    const merchEl = document.getElementById('rec-merchant-name');
    const clientEl = document.getElementById('rec-client-name');
    const methodEl = document.getElementById('rec-payment-method');
    const txEl = document.getElementById('rec-tx-ref');
    const amountEl = document.getElementById('rec-total-amount');
    const waBtn = document.getElementById('rec-share-whatsapp-btn');
    const copyBtn = document.getElementById('rec-copy-link-btn');

    if (numEl) numEl.textContent = receipt.receipt_number || 'REC-2026-000001';
    if (dateEl) dateEl.textContent = new Date(receipt.paid_at || receipt.created_at).toLocaleString('fr-FR');
    if (merchEl) merchEl.textContent = receipt.merchant?.businessName || receipt.metadata?.merchant_name || 'Boutique MoneyLink';
    if (clientEl) clientEl.textContent = receipt.client_name || 'Client Partenaire';
    if (methodEl) methodEl.textContent = receipt.payment_method === 'WAVE' ? 'Wave Sénégal' : (receipt.payment_method === 'ORANGE_MONEY' ? 'Orange Money' : receipt.payment_method);
    if (txEl) txEl.textContent = receipt.transaction_reference || 'REF-TX-0000';
    if (amountEl) amountEl.textContent = formatFCFA(receipt.amount || 0);

    const shareUrl = `https://moneylink.sn/receipts/view?token=${receipt.share_token || receipt.id}`;
    if (waBtn) {
      const waMsg = encodeURIComponent(`🧾 *Reçu Numérique MoneyLink N° ${receipt.receipt_number}*\nMontant réglé : *${formatFCFA(receipt.amount)}*\nCommerçant : *${receipt.merchant?.businessName || 'Boutique'}*\nLien sécurisé : ${shareUrl}`);
      waBtn.href = `https://wa.me/?text=${waMsg}`;
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(shareUrl);
        Toast.show('Lien du reçu copié dans le presse-papier ! 🔗');
      };
    }
  },

  init() {
    document.getElementById('open-new-invoice-btn')?.addEventListener('click', () => this.openCreateModal());
    document.getElementById('inv-add-row-btn')?.addEventListener('click', () => this.addItemRow());
    document.getElementById('inv-discount')?.addEventListener('input', () => this.updateTotals());
    document.getElementById('create-invoice-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitInvoice();
    });

    const initialRow = document.querySelector('#inv-items-container .inv-item-row');
    if (initialRow) this.bindRowInputs(initialRow);
  }
};

// ============================================================================
// 10f. MODULE LOCALISATION & INTERNATIONALISATION (I18N)
// ============================================================================
const I18nModule = {
  init() {
    if (window.I18n) {
      window.I18n.init();
    }

    const menuBtn = document.getElementById('lang-menu-btn');
    const popover = document.getElementById('lang-menu-popover');

    if (menuBtn && popover) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.toggle('active');
      });

      document.addEventListener('click', () => popover.classList.remove('active'));
    }

    document.querySelectorAll('.lang-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (window.I18n && lang) {
          window.I18n.setLanguage(lang);
          popover?.classList.remove('active');
          Toast.show(lang === 'wo' ? '🇸🇳 Làkku Wolof duggal nañu ko !' : '🇫🇷 Langue changée en Français !', 'info');
        }
      });
    });

    window.addEventListener('moneylink:languageChanged', (e) => {
      if (AppState.user) {
        AiModule.loadInsights();
      }
    });
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
  I18nModule.init();
  Tracker.init();
  Auth.init();
  Catalog.init();
  Cart.init();
  Modal.init();
  AiModule.init();
  ShieldModule.init();
  InvoiceModule.init();
  initApiStatusCheck();
  initPaymentMethodsStatus();
  initEcosystemStats();
  initEscrowCalculator();
  initFaqAccordion();
  initHashRouter();
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

  // 7. Formulaire Profil Marchand
  document.getElementById('merchant-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      first_name: document.getElementById('merchant-prof-fname').value.trim(),
      last_name: document.getElementById('merchant-prof-lname').value.trim(),
      phone: document.getElementById('merchant-prof-phone').value.trim(),
      whatsapp_phone: document.getElementById('merchant-prof-whatsapp').value.trim(),
      business_name: document.getElementById('merchant-prof-bizname').value.trim(),
      business_type: document.getElementById('merchant-prof-biztype').value,
      description: document.getElementById('merchant-prof-desc').value.trim(),
      address: document.getElementById('merchant-prof-address').value.trim(),
      quartier: document.getElementById('merchant-prof-quartier').value.trim(),
      city: document.getElementById('merchant-prof-city').value.trim(),
      country: document.getElementById('merchant-prof-country').value.trim(),
      logo_url: document.getElementById('merchant-prof-logo-url').value.trim()
    };
    await MerchantPortal.saveProfile(payload);
  });

  // Gestion de l'Upload du Logo Marchand
  document.getElementById('merchant-logo-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) MerchantPortal.handleLogoUpload(file);
  });

  document.getElementById('merchant-remove-logo-btn')?.addEventListener('click', () => {
    MerchantPortal.removeLogo();
  });

  // Gestion de l'Upload de l'Image Produit
  document.getElementById('prod-form-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) MerchantPortal.handleProductImageUpload(file);
  });

  document.getElementById('prod-form-remove-img-btn')?.addEventListener('click', () => {
    MerchantPortal.removeProductImage();
  });

  // Aperçu interactif du prix en FCFA
  document.getElementById('prod-form-price')?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    const previewEl = document.getElementById('prod-form-price-preview');
    if (previewEl) previewEl.textContent = formatFCFA(val);
  });

  // 8. Formulaire Produit Marchand (Ajout / Édition)
  document.getElementById('merchant-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('prod-edit-id').value;
    const payload = {
      name: document.getElementById('prod-form-name').value.trim(),
      category: document.getElementById('prod-form-category').value,
      subcategory: document.getElementById('prod-form-subcategory').value.trim(),
      price: parseFloat(document.getElementById('prod-form-price').value),
      stock: parseInt(document.getElementById('prod-form-stock').value, 10),
      city: document.getElementById('prod-form-city').value.trim(),
      quartier: document.getElementById('prod-form-quartier').value.trim(),
      image_url: document.getElementById('prod-form-image').value.trim(),
      description: document.getElementById('prod-form-desc').value.trim()
    };

    const submitBtn = document.getElementById('prod-form-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enregistrement...';
    }

    try {
      if (editId) {
        await Api.put(`/merchants/products/${editId}`, payload);
        Toast.show('Produit mis à jour avec succès.');
      } else {
        await Api.post('/merchants/products', payload);
        Toast.show('✅ Produit publié avec succès !');
      }
      Modal.close('product-form-modal');
      MerchantPortal.loadProducts();
      MerchantPortal.loadStats();
      Catalog.loadProducts();
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '🚀 Publier le produit';
      }
    }
  });

  // 9. Formulaire Validation Code OTP (Marchand)
  document.getElementById('validate-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('otp-order-id').value;
    const code = document.getElementById('otp-code-input').value.trim();
    await MerchantPortal.validateOtpCode(orderId, code);
  });

  // 10. Formulaire Litige (Client)
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

  // 11. Boutons d'actualisation & Onglets Portails
  document.getElementById('client-refresh-orders-btn')?.addEventListener('click', () => {
    ClientPortal.loadOrders();
    ClientPortal.loadProfile();
    AiModule.loadInsights();
    AiModule.loadConversations();
    ShieldModule.loadAlerts();
    InvoiceModule.loadClientInvoices();
  });

  document.getElementById('merchant-refresh-btn')?.addEventListener('click', () => {
    MerchantPortal.loadStats();
    MerchantPortal.loadProfile();
    MerchantPortal.loadProducts();
    MerchantPortal.loadOrders();
    BusinessModule.loadDashboard();
    InvoiceModule.loadMerchantInvoices();
    AiModule.loadMerchantConversations();
  });

  document.getElementById('merchant-add-product-btn')?.addEventListener('click', () => MerchantPortal.openAddProductModal());
  document.getElementById('merchant-new-prod-btn-2')?.addEventListener('click', () => MerchantPortal.openAddProductModal());

  // 12. CTAs Hero & Audience V2.5
  document.getElementById('hero-create-acc-btn')?.addEventListener('click', () => {
    Modal.open('auth-modal');
    const clientTab = document.querySelector('[data-auth-tab="register-client-tab"]');
    if (clientTab) clientTab.click();
  });

  document.getElementById('cta-section-merchant-btn')?.addEventListener('click', () => {
    Modal.open('auth-modal');
    const merchTab = document.querySelector('[data-auth-tab="register-merchant-tab"]');
    if (merchTab) merchTab.click();
  });

  document.getElementById('cta-section-client-btn')?.addEventListener('click', () => {
    Modal.open('auth-modal');
    const clientTab = document.querySelector('[data-auth-tab="register-client-tab"]');
    if (clientTab) clientTab.click();
  });

  // 13. Formulaire Early Access V2.5
  document.getElementById('early-access-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('ea-submit-btn');
    const profileRadio = document.querySelector('input[name="ea_profile_type"]:checked');

    const payload = {
      first_name: document.getElementById('ea-fname').value.trim(),
      last_name: document.getElementById('ea-lname').value.trim(),
      phone: document.getElementById('ea-phone').value.trim(),
      email: document.getElementById('ea-email').value.trim(),
      profile_type: profileRadio ? profileRadio.value : 'PARTICULIER',
      city: document.getElementById('ea-city').value.trim(),
      honeypot: document.getElementById('ea-honeypot')?.value || ''
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Envoi en cours... ⏳';
    }

    try {
      const res = await Api.post('/early-access', payload);
      if (res.success) {
        Toast.show(res.message || 'Bienvenue dans l’Early Access MoneyLink !', 'success');
        document.getElementById('early-access-form').reset();
        initEcosystemStats();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Rejoindre MoneyLink 🚀';
      }
    }
  });

  // 14. Formulaire Contact V2.5
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('contact-submit-btn');

    const payload = {
      name: document.getElementById('contact-name').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      phone: document.getElementById('contact-phone').value.trim() || undefined,
      category: document.getElementById('contact-category').value,
      subject: document.getElementById('contact-subject').value.trim(),
      message: document.getElementById('contact-message').value.trim(),
      honeypot: document.getElementById('contact-honeypot')?.value || ''
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Envoi en cours... ⏳';
    }

    try {
      const res = await Api.post('/contact', payload);
      if (res.success) {
        Toast.show(res.message || 'Message transmis avec succès !', 'success');
        document.getElementById('contact-form').reset();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Envoyer le message ✉️';
      }
    }
  });

  // 15. Liens Modales Légales
  document.getElementById('link-legal-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    Modal.open('modal-terms');
  });

  document.getElementById('link-legal-privacy')?.addEventListener('click', (e) => {
    e.preventDefault();
    Modal.open('modal-privacy');
  });

  document.getElementById('link-legal-cookies')?.addEventListener('click', (e) => {
    e.preventDefault();
    Modal.open('modal-cookies');
  });

  document.getElementById('link-legal-notice')?.addEventListener('click', (e) => {
    e.preventDefault();
    Modal.open('modal-legal');
  });

  // Onglets Espace Client
  document.querySelectorAll('#client-portal-tabs .portal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#client-portal-tabs .portal-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-client-tab');

      document.querySelectorAll('.client-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) targetContent.style.display = 'block';

      if (targetTab === 'client-ai-tab') {
        AiModule.loadInsights();
        AiModule.loadConversations();
      } else if (targetTab === 'client-shield-tab') {
        ShieldModule.loadAlerts();
      } else if (targetTab === 'client-invoices-tab') {
        InvoiceModule.loadClientInvoices();
      } else if (targetTab === 'client-orders-tab') {
        ClientPortal.loadOrders();
      }
    });
  });

  // Onglets Espace Marchand
  document.querySelectorAll('#merchant-portal-tabs .portal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#merchant-portal-tabs .portal-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');

      document.querySelectorAll('.portal-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(tabTarget);
      if (targetContent) targetContent.style.display = 'block';

      if (tabTarget === 'merchant-profile-tab') {
        MerchantPortal.loadProfile();
      } else if (tabTarget === 'merchant-business-tab') {
        BusinessModule.loadDashboard();
      } else if (tabTarget === 'merchant-invoices-tab') {
        InvoiceModule.loadMerchantInvoices();
      } else if (tabTarget === 'merchant-ai-tab') {
        AiModule.loadMerchantConversations();
      } else if (tabTarget === 'merchant-products-tab') {
        MerchantPortal.loadProducts();
      } else if (tabTarget === 'merchant-orders-tab') {
        MerchantPortal.loadOrders();
      }
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
  return new Intl.NumberFormat('fr-FR').format(val).replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
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

// ============================================================================
// 14. NOUVELLES FONCTIONS V2.5 LAUNCH EDITION
// ============================================================================

/**
 * Récupère dynamiquement le statut réel des moyens de paiement (Wave, OM, Free)
 */
async function initPaymentMethodsStatus() {
  try {
    const res = await Api.get('/public/payment-methods');
    if (res.success && res.data && Array.isArray(res.data.methods)) {
      const waveMethod = res.data.methods.find(m => m.code === 'WAVE');
      const omMethod = res.data.methods.find(m => m.code === 'ORANGE_MONEY');

      const waveBadge = document.getElementById('badge-wave-status');
      if (waveBadge && waveMethod) {
        waveBadge.textContent = waveMethod.status_label || '🔵 Sandbox';
        waveBadge.className = `payment-badge-status badge-status-${waveMethod.status.toLowerCase().replace('_', '-')}`;
      }

      const omBadge = document.getElementById('badge-om-status');
      if (omBadge && omMethod) {
        omBadge.textContent = omMethod.status_label || '🔵 Sandbox';
        omBadge.className = `payment-badge-status badge-status-${omMethod.status.toLowerCase().replace('_', '-')}`;
      }
    }
  } catch (err) {
    console.warn('[Payment Status Check Warning]', err.message);
  }
}

/**
 * Récupère les métriques réelles de la base pour le bloc de transparence
 */
async function initEcosystemStats() {
  try {
    const res = await Api.get('/public/ecosystem-stats');
    if (res.success && res.data) {
      const mEl = document.getElementById('metric-merchants');
      const pEl = document.getElementById('metric-products');
      const oEl = document.getElementById('metric-orders');
      const eaEl = document.getElementById('metric-early-access');

      if (mEl) mEl.textContent = res.data.active_merchants || '0';
      if (pEl) pEl.textContent = res.data.active_products || '0';
      if (oEl) oEl.textContent = res.data.total_orders || '0';
      if (eaEl) eaEl.textContent = res.data.early_access_users || '0';
    }
  } catch (err) {
    console.warn('[Ecosystem Stats Warning]', err.message);
  }
}

/**
 * Gestion du routage hash pour affichage direct des modales et sections
 */
function initHashRouter() {
  function handleHash() {
    const hash = window.location.hash;
    if (!hash) return;

    if (hash === '#conditions') {
      Modal.open('modal-terms');
    } else if (hash === '#confidentialite') {
      Modal.open('modal-privacy');
    } else if (hash === '#cookies') {
      Modal.open('modal-cookies');
    } else if (hash === '#mentions-legales') {
      Modal.open('modal-legal');
    } else if (hash === '#early-access') {
      document.getElementById('early-access')?.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#contact') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#securite') {
      document.getElementById('securite')?.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#paiements') {
      document.getElementById('paiements')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  window.addEventListener('hashchange', handleHash);
  handleHash();
}

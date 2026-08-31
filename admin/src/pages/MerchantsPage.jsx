import React, { useState, useEffect } from 'react';
import { Store, CheckCircle, Shield, Package, Check, X, Trash2, Eye, EyeOff, Search, AlertCircle, AlertTriangle } from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';

export function MerchantsPage() {
  const { token } = useAuth();
  const [merchants, setMerchants] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('merchants'); // 'merchants' | 'products'
  const [merchantFilter, setMerchantFilter] = useState('all'); // 'all' | 'with_products' | 'without_products' | 'ACTIVE' | 'INACTIVE'
  const [productFilter, setProductFilter] = useState('all'); // 'all' | 'visible' | 'invisible' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'INACTIVE' | 'out_of_stock'
  const [merchantSearch, setMerchantSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMerchants = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/merchants`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setMerchants(data.data || []);
      } else {
        // Fallback endpoint public si route admin non encore disponible
        const fallbackRes = await fetch(`${API_BASE}/merchants`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success) {
          setMerchants(fallbackData.data || []);
        }
      }
    } catch (err) {
      console.error('Erreur chargement commerçants :', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement produits admin :', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchMerchants(), fetchProducts()]);
      setLoading(false);
    };
    loadAll();
  }, [token]);

  const handleUpdateProductStatus = async (productId, newStatus, isActive = true) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/admin/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, is_active: isActive })
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchProducts(), fetchMerchants()]);
      } else {
        alert(data.error || 'Erreur lors de la mise à jour.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur de connexion au serveur.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Voulez-vous vraiment désactiver ce produit de la plateforme ?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchProducts(), fetchMerchants()]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterMerchantProducts = (merchantId) => {
    setSelectedMerchantId(merchantId);
    setActiveTab('products');
    setProductFilter('all');
  };

  // Filtrage des commerçants
  const filteredMerchants = merchants.filter(m => {
    const total = m.total_products_count !== undefined ? m.total_products_count : products.filter(p => p.merchant_id === m.id).length;
    if (merchantFilter === 'with_products' && total === 0) return false;
    if (merchantFilter === 'without_products' && total > 0) return false;
    if (merchantFilter === 'ACTIVE' && m.status !== 'ACTIVE') return false;
    if (merchantFilter === 'INACTIVE' && m.status === 'ACTIVE') return false;

    if (merchantSearch.trim()) {
      const q = merchantSearch.toLowerCase().trim();
      const matchName = m.business_name && m.business_name.toLowerCase().includes(q);
      const matchPhone = m.phone && m.phone.toLowerCase().includes(q);
      const matchUser = m.user_name && m.user_name.toLowerCase().includes(q);
      const matchCity = m.city && m.city.toLowerCase().includes(q);
      return matchName || matchPhone || matchUser || matchCity;
    }
    return true;
  });

  // Filtrage des produits
  const filteredProducts = products.filter(p => {
    if (selectedMerchantId && p.merchant_id !== selectedMerchantId) return false;

    if (productFilter === 'visible' && !p.is_publicly_visible) return false;
    if (productFilter === 'invisible' && p.is_publicly_visible) return false;
    if (productFilter === 'out_of_stock' && p.stock > 0) return false;
    if (['APPROVED', 'PENDING', 'REJECTED', 'INACTIVE'].includes(productFilter)) {
      if (p.status !== productFilter) return false;
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchMerchant = p.merchant_name && p.merchant_name.toLowerCase().includes(q);
      return matchName || matchDesc || matchMerchant;
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Espace Commerçants &amp; Synchronisation Catalogue</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Contrôle d'activité des boutiques, décompte réel en base PostgreSQL et visibilité du catalogue public.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${activeTab === 'merchants' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveTab('merchants'); setSelectedMerchantId(null); }}
            style={{ padding: '8px 16px', fontSize: '13.5px' }}
          >
            <Store size={16} style={{ marginRight: '6px' }} />
            Commerçants ({merchants.length})
          </button>
          <button
            className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('products')}
            style={{ padding: '8px 16px', fontSize: '13.5px' }}
          >
            <Package size={16} style={{ marginRight: '6px' }} />
            Catalogue &amp; Modération ({products.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Chargement des données en cours depuis PostgreSQL...
        </div>
      ) : activeTab === 'merchants' ? (
        <div>
          {/* Barre de recherche et filtres commerçants */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `Tous (${merchants.length})` },
                { id: 'with_products', label: 'Avec produits en BDD' },
                { id: 'without_products', label: 'Sans produit (0 article)' },
                { id: 'ACTIVE', label: 'Actifs' },
                { id: 'INACTIVE', label: 'Inactifs' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setMerchantFilter(f.id)}
                  className={`btn-sm ${merchantFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 12px' }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Rechercher boutique, nom, tel..."
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '13px'
                }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Grille des commerçants */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredMerchants.map((m) => {
              const total = m.total_products_count !== undefined ? m.total_products_count : products.filter(p => p.merchant_id === m.id).length;
              const visible = m.visible_products_count !== undefined ? m.visible_products_count : products.filter(p => p.merchant_id === m.id && p.is_publicly_visible).length;
              const invisible = m.invisible_products_count !== undefined ? m.invisible_products_count : (total - visible);
              const isMerchantActive = m.status === 'ACTIVE';

              return (
                <div key={m.id} className="card-table-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                      <img
                        src={resolveImageUrl(m.logo_url, '/assets/moneylink_logo_mark.svg')}
                        alt={m.business_name}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/moneylink_logo_mark.svg'; }}
                        style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{m.business_name}</h3>
                          {m.is_verified && <CheckCircle size={16} color="#00a86b" />}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {m.business_type || 'Commerce Général'} • {m.city || 'Dakar'} {m.quartier ? `(${m.quartier})` : ''}
                        </div>
                      </div>
                      <span className={`status-pill ${isMerchantActive ? 'status-success' : 'status-danger'}`}>
                        {m.status}
                      </span>
                    </div>

                    {m.user_name && (
                      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                        👤 <strong>Gérant :</strong> {m.user_name} ({m.user_phone || m.phone})
                      </div>
                    )}

                    <p style={{ fontSize: '12.5px', color: '#475569', marginBottom: '14px', minHeight: '34px', lineHeight: '1.4' }}>
                      {m.description || 'Boutique certifiée MoneyLink Sénégal.'}
                    </p>

                    {/* Bloc Diagnostic de Visibilité Catalogue */}
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      background: !isMerchantActive ? '#fef2f2' : total === 0 ? '#f1f5f9' : invisible === 0 ? '#ecfdf5' : '#fffbeb',
                      border: `1px solid ${!isMerchantActive ? '#fecaca' : total === 0 ? '#cbd5e1' : invisible === 0 ? '#a7f3d0' : '#fde68a'}`,
                      color: !isMerchantActive ? '#b91c1c' : total === 0 ? '#475569' : invisible === 0 ? '#047857' : '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {!isMerchantActive ? (
                        <>
                          <AlertCircle size={16} />
                          <span>Boutique INACTIVE → Produits masqués</span>
                        </>
                      ) : total === 0 ? (
                        <>
                          <Package size={16} />
                          <span>0 produit en BDD → Aucun article publié</span>
                        </>
                      ) : invisible === 0 ? (
                        <>
                          <CheckCircle size={16} />
                          <span>{total} produit(s) en BDD → {visible} visible(s) au catalogue</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} />
                          <span>{total} produits en BDD → {visible} visible(s) • {invisible} masqué(s)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                      📞 {m.phone || 'Non renseigné'}
                    </span>

                    <button
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      onClick={() => handleFilterMerchantProducts(m.id)}
                    >
                      Voir ses articles ({total})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Onglet Modération & Diagnostic Catalogue */
        <div className="card-table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                Catalogue des Produits ({filteredProducts.length})
                {selectedMerchantId && (
                  <span style={{ fontSize: '12px', marginLeft: '8px', color: '#00a86b', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px' }}>
                    Filtre par boutique active
                    <button
                      onClick={() => setSelectedMerchantId(null)}
                      style={{ border: 'none', background: 'transparent', marginLeft: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { id: 'all', label: 'Tous' },
                { id: 'visible', label: '✅ Visibles Catalogue' },
                { id: 'invisible', label: '⚠️ Non Visibles' },
                { id: 'APPROVED', label: 'APPROVED' },
                { id: 'PENDING', label: 'PENDING' },
                { id: 'REJECTED', label: 'REJECTED' },
                { id: 'out_of_stock', label: 'Stock 0' }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setProductFilter(st.id)}
                  className={`btn-sm ${productFilter === st.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: '6px', fontSize: '12px', padding: '4px 10px' }}
                >
                  {st.label}
                </button>
              ))}

              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder="Rechercher produit..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px 5px 28px',
                    borderRadius: '6px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Photo &amp; Article</th>
                  <th>Boutique Marchand</th>
                  <th>Prix (FCFA)</th>
                  <th>Stock</th>
                  <th>Statut Modération</th>
                  <th>Visibilité Catalogue Public</th>
                  <th style={{ textAlign: 'right' }}>Actions Modération</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Aucun produit ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isVisible = p.is_publicly_visible !== undefined 
                      ? p.is_publicly_visible 
                      : (p.is_active && (p.status === 'APPROVED' || !p.status) && p.stock > 0);

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={resolveImageUrl(p.image_url)}
                              alt={p.name}
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/product-placeholder.svg'; }}
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                            />
                            <div>
                              <strong style={{ fontSize: '13.5px' }}>{p.name}</strong>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{p.category || 'Général'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.merchant_name || 'Commerçant'}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {p.merchant_city || 'Dakar'} • <span className={p.merchant_status === 'ACTIVE' ? 'text-success' : 'text-danger'} style={{ fontSize: '10.5px', fontWeight: 'bold' }}>{p.merchant_status || 'ACTIVE'}</span>
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: '#00a86b', fontSize: '13.5px' }}>
                            {new Intl.NumberFormat('fr-FR').format(p.price)} FCFA
                          </strong>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: p.stock === 0 ? '#fee2e2' : p.stock <= 3 ? '#fef3c7' : '#f1f5f9',
                            color: p.stock === 0 ? '#dc2626' : p.stock <= 3 ? '#d97706' : '#0f172a'
                          }}>
                            {p.stock} {p.stock === 0 ? '(Épuisé)' : ''}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${
                            p.status === 'APPROVED' ? 'status-success' :
                            p.status === 'PENDING' ? 'status-warning' :
                            p.status === 'REJECTED' ? 'status-danger' : 'status-neutral'
                          }`}>
                            {p.status || (p.is_active ? 'APPROVED' : 'INACTIVE')}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span className={`status-pill ${isVisible ? 'status-success' : 'status-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {isVisible ? <Check size={12} /> : <AlertTriangle size={12} />}
                              {isVisible ? 'VISIBLE' : 'NON VISIBLE'}
                            </span>
                            <div style={{ fontSize: '11px', color: isVisible ? '#059669' : '#b45309', marginTop: '3px', fontWeight: 500 }}>
                              {p.visibility_reason || (isVisible ? 'Actif et visible' : 'Non visible au catalogue')}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {p.status !== 'APPROVED' && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: '#059669', borderColor: '#10b981', padding: '4px 8px' }}
                                onClick={() => handleUpdateProductStatus(p.id, 'APPROVED', true)}
                                title="Approuver et activer le produit"
                                disabled={actionLoading}
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {p.status !== 'REJECTED' && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: '#dc2626', borderColor: '#ef4444', padding: '4px 8px' }}
                                onClick={() => handleUpdateProductStatus(p.id, 'REJECTED', false)}
                                title="Rejeter le produit"
                                disabled={actionLoading}
                              >
                                <X size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ color: '#64748b', padding: '4px 8px' }}
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Désactiver"
                              disabled={actionLoading}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

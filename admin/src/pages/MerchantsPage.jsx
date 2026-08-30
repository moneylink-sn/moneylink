import React, { useState, useEffect } from 'react';
import { Store, CheckCircle, Shield, Package, Check, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';

export function MerchantsPage() {
  const { token } = useAuth();
  const [merchants, setMerchants] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('merchants'); // 'merchants' | 'products'
  const [productFilter, setProductFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMerchants = async () => {
    try {
      const res = await fetch(`${API_BASE}/merchants`);
      const data = await res.json();
      if (data.success) {
        setMerchants(data.data || []);
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
        await fetchProducts();
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
        await fetchProducts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (productFilter === 'all') return true;
    return p.status === productFilter;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Espace Commerçants &amp; Modération Produits</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Supervision des profils marchands, contrôle de conformité et modération des articles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${activeTab === 'merchants' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('merchants')}
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
            Modération Produits ({products.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Chargement des données en cours...
        </div>
      ) : activeTab === 'merchants' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {merchants.map((m) => (
            <div key={m.id} className="card-table-container" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <img
                  src={resolveImageUrl(m.logo_url, '/assets/moneylink_logo_mark.svg')}
                  alt={m.business_name}
                  style={{ width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ fontSize: '16px' }}>{m.business_name}</h3>
                    {m.is_verified && <CheckCircle size={16} color="#00a86b" />}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {m.business_type} • {m.city || 'Dakar'} {m.quartier ? `(${m.quartier})` : ''}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', minHeight: '38px' }}>
                {m.description || 'Boutique certifiée MoneyLink Sénégal.'}
              </p>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`status-pill ${m.status === 'ACTIVE' ? 'status-success' : 'status-danger'}`}>
                  {m.status}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                  📞 {m.phone || 'Non renseigné'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Catalogue des Produits ({filteredProducts.length})</h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'APPROVED', 'PENDING', 'REJECTED', 'INACTIVE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setProductFilter(st)}
                  className={`btn-sm ${productFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: '6px', fontSize: '12px', padding: '4px 10px' }}
                >
                  {st === 'all' ? 'Tous' : st}
                </button>
              ))}
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
                  <th>Localisation</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions Modération</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Aucun produit trouvé dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={resolveImageUrl(p.image_url, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100')}
                            alt={p.name}
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong style={{ fontSize: '13.5px' }}>{p.name}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{p.category || 'Général'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.merchant_name || 'Commerçant'}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>{p.merchant_city || 'Dakar'}</div>
                      </td>
                      <td>
                        <strong style={{ color: '#00a86b' }}>
                          {new Intl.NumberFormat('fr-FR').format(p.price)} FCFA
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: p.stock <= 3 ? '#d97706' : '#0f172a' }}>
                          {p.stock}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {p.city || 'Dakar'} {p.quartier ? `(${p.quartier})` : ''}
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
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {p.status !== 'APPROVED' && (
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ color: '#059669', borderColor: '#10b981', padding: '4px 8px' }}
                              onClick={() => handleUpdateProductStatus(p.id, 'APPROVED', true)}
                              title="Approuver le produit"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

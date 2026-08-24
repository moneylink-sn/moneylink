import React, { useState } from 'react';
import { 
  Settings, 
  Shield, 
  CreditCard, 
  Globe, 
  Server, 
  Key, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Zap,
  Info
} from 'lucide-react';

export function SettingsPage() {
  const [activeSubTab, setActiveSubTab] = useState('general');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Paramètres de la Plateforme</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Configuration système, passerelles de paiement, commissions et sécurité de production MoneyLink.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#e8f8f2', padding: '6px 14px', borderRadius: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00a86b', display: 'inline-block' }}></span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#007a4d' }}>Environnement Prêt pour Production</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        {[
          { id: 'general', label: 'Général & Domaines', icon: Globe },
          { id: 'fees', label: 'Commissions & Abonnements', icon: Percent },
          { id: 'gateways', label: 'Passerelles Wave & OM', icon: CreditCard },
          { id: 'security', label: 'Sécurité & Infrastructure', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card-table-container" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#00a86b" /> Topologie des Noms de Domaine
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Site Public & Vitrine</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>https://moneylink.sn / www.moneylink.sn</div>
                <div style={{ fontSize: '12px', color: '#00a86b', marginTop: '2px' }}>✅ HTTPS / SSL Actif • Nginx Reverse Proxy</div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>API Backend Core</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>https://api.moneylink.sn</div>
                <div style={{ fontSize: '12px', color: '#00a86b', marginTop: '2px' }}>✅ Health Endpoint : /api/health (200 OK)</div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Dashboard Administrateur</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>https://admin.moneylink.sn</div>
                <div style={{ fontSize: '12px', color: '#00a86b', marginTop: '2px' }}>✅ Authentification JWT + Rôle ADMIN Strict</div>
              </div>
            </div>
          </div>

          <div className="card-table-container" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#3b82f6" /> Administrateur Officiel du Système
            </h3>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#00a86b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                  CS
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Codé SAMB</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>admin@moneylink.sn • Fondateur & Super-Admin</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Compte maître doté des privilèges de supervision intégrale, arbitrage des litiges de séquestre, gestion des commissions et visualisation des analytics en temps réel.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'fees' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card-table-container" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} color="#f59e0b" /> Modèle Économique & Commissions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Commission de Séquestre Escrow</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00a86b', marginTop: '4px' }}>1.0%</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Prélevée automatiquement lors du déblocage des fonds au marchand</div>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Abonnement MoneyLink Premium</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>500 FCFA / mois</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Après 30 jours d'essai gratuit offert à tous les nouveaux inscrits</div>
              </div>
            </div>
          </div>

          <div className="card-table-container" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} color="#00a86b" /> Règle de Comptabilisation des Revenus
            </h3>
            <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={20} color="#059669" style={{ marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#065f46', lineHeight: '1.6' }}>
                  <strong>Intégrité Absolue des Données Financières :</strong>
                  <br />
                  Seuls les paiements validés avec succès (statut <code>SUCCESS</code> ou <code>CONFIRMED</code>) sont pris en compte dans le calcul des revenus réels. Les intentions, échecs ou transactions en attente sont strictement isolés.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'gateways' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card-table-container" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#00a86b" /> Wave Sénégal (Checkout & Webhooks)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Connecteur</span>
                <span style={{ fontWeight: 600 }}>WaveDriver (HMAC-SHA256)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Webhook Endpoint</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>/api/webhooks/wave</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Validation Signature</span>
                <span style={{ color: '#00a86b', fontWeight: 600 }}>En-tête wave-signature</span>
              </div>
            </div>
          </div>

          <div className="card-table-container" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#f97316" /> Orange Money Sénégal (Web Payment)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Connecteur</span>
                <span style={{ fontWeight: 600 }}>OrangeMoneyDriver (OAuth2/HMAC)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Webhook Endpoint</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>/api/webhooks/orange-money</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Validation Signature</span>
                <span style={{ color: '#00a86b', fontWeight: 600 }}>En-tête x-om-signature</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'security' && (
        <div className="card-table-container" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#00a86b" /> Normes de Sécurité Appliquées
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>🛡️ Helmet & En-têtes HTTP</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Protection XSS, Clickjacking, HSTS et renforcement DNS</div>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>⏱️ Rate Limiting</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>300 requêtes / 15 minutes par adresse IP pour contrer les attaques brute-force</div>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>🔑 Cryptographie BCrypt & JWT</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Hashage des mots de passe (10 rounds) et tokens signés avec expiration</div>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>🔒 Code OTP Séquestre Hashé</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Les codes secrets de livraison à 6 chiffres sont chiffrés en base avant validation</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;

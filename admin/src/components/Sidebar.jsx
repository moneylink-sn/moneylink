import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  PiggyBank,
  Sparkles,
  ShieldCheck,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentTab, setCurrentTab }) {
  const { logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'statistics', label: 'Statistiques & KPIs', icon: BarChart3 },
    { id: 'subscriptions', label: 'Abonnements (500 F)', icon: Sparkles },
    { id: 'users', label: 'Utilisateurs & Rôles', icon: Users },
    { id: 'merchants', label: 'Commerçants', icon: Store },
    { id: 'orders', label: 'Commandes Séquestre', icon: ShoppingBag },
    { id: 'transactions', label: 'Transactions & Solde', icon: CreditCard },
    { id: 'disputes', label: 'Litiges & Remboursements', icon: AlertTriangle },
    { id: 'savings', label: 'Coffres d’Épargne', icon: PiggyBank },
    { id: 'audit', label: 'Sécurité & Audit', icon: ShieldCheck },
    { id: 'settings', label: 'Paramètres Plateforme', icon: Settings },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <img
          src="/assets/moneylink_logo_mark.svg"
          alt="MoneyLink Logo"
          style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="sidebar-logo-mk" style={{ display: 'none' }}>
          <span>MK</span>
        </div>
        <div>
          <h2 style={{ fontSize: '18px', color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>MoneyLink</h2>
          <span style={{ fontSize: '11px', color: '#00a86b', fontWeight: 600, letterSpacing: '0.5px' }}>ADMINISTRATION</span>
        </div>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <li key={item.id} className="sidebar-item">
              <button
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          className="sidebar-link"
          style={{ color: '#ef4444' }}
          onClick={logout}
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

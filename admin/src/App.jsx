import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { UsersPage } from './pages/UsersPage';
import { MerchantsPage } from './pages/MerchantsPage';
import { OrdersPage } from './pages/OrdersPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { DisputesPage } from './pages/DisputesPage';
import { SavingsPage } from './pages/SavingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'statistics':
        return <StatisticsPage />;
      case 'subscriptions':
        return <SubscriptionsPage />;
      case 'users':
        return <UsersPage />;
      case 'merchants':
        return <MerchantsPage />;
      case 'orders':
        return <OrdersPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'disputes':
        return <DisputesPage />;
      case 'savings':
        return <SavingsPage />;
      case 'audit':
        return <AuditLogsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="admin-main">
        <Header />
        <main className="admin-content">
          {renderContent()}
        </main>
        <footer className="admin-footer">
          <div>
            <span>MoneyLink &copy; 2026 — Créé par <strong>Codé SAMB</strong></span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Fondateur &amp; Administrateur • Console FinTech Sénégal
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

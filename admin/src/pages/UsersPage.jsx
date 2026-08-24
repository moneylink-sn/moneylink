import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Search } from 'lucide-react';
import { API_BASE } from '../config/api';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    const matchesSearch =
      u.first_name.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Gestion des Utilisateurs</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Consultez les comptes, les rôles, les soldes et suspendez des comptes en cas de fraude.
          </p>
        </div>
      </div>

      <div className="card-table-container">
        <div className="table-header">
          <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, e-mail..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'CLIENT', 'MERCHANT', 'ADMIN'].map((role) => (
              <button
                key={role}
                className={`btn ${filterRole === role ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={() => setFilterRole(role)}
              >
                {role === 'ALL' ? 'Tous' : role}
              </button>
            ))}
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Solde Disponible</th>
              <th>Séquestre</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  Chargement des utilisateurs...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#e8f8f2',
                          color: '#007a4d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        {u.first_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{u.phone}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          u.role === 'ADMIN'
                            ? '#fee2e2'
                            : u.role === 'MERCHANT'
                            ? '#fef3c7'
                            : '#dbeafe',
                        color:
                          u.role === 'ADMIN'
                            ? '#b91c1c'
                            : u.role === 'MERCHANT'
                            ? '#b45309'
                            : '#1d4ed8',
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#00a86b' }}>
                    {(u.available_balance || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ fontWeight: 600, color: '#b45309' }}>
                    {(u.locked_balance || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        u.status === 'ACTIVE' ? 'status-success' : 'status-danger'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${u.status === 'ACTIVE' ? 'btn-outline' : 'btn-primary'}`}
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

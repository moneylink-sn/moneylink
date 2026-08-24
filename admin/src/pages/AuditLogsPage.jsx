import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export function AuditLogsPage() {
  const sampleAuditEvents = [
    {
      id: 'al-1',
      action: 'ORDER_DISPUTE_RESOLVED',
      actor: 'Moustapha Gueye (Admin)',
      resource: 'Commande #ML-2026-003',
      ip: '196.207.240.1',
      time: 'Il y a 10 minutes',
      details: 'Remboursement de 18 000 FCFA validé au bénéfice de l’acheteur.'
    },
    {
      id: 'al-2',
      action: 'ESCROW_CODE_VALIDATED',
      actor: 'Système Séquestre Automatique',
      resource: 'Commande #ML-2026-001',
      ip: '196.207.240.42',
      time: 'Il y a 1 heure',
      details: 'Validation du code OTP 849201. Libération de 44 550 FCFA vers le solde marchand.'
    },
    {
      id: 'al-3',
      action: 'ADMIN_LOGIN_SUCCESS',
      actor: 'Moustapha Gueye',
      resource: 'Console Admin',
      ip: '196.207.240.1',
      time: 'Il y a 3 heures',
      details: 'Session ouverte avec token JWT 256 bits.'
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px' }}>Journal de Sécurité & Piste d'Audit</h1>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Registre d’audit immuable des opérations financières, modifications d’états de séquestre et accès sensibles.
        </p>
      </div>

      <div className="card-table-container">
        <div className="table-header">
          <h3 style={{ fontSize: '16px' }}>Événements d'Audit Récents</h3>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Acteur</th>
              <th>Cible / Ressource</th>
              <th>Adresse IP</th>
              <th>Horodatage</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {sampleAuditEvents.map((evt) => (
              <tr key={evt.id}>
                <td>
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b' }}>{evt.action}</span>
                </td>
                <td style={{ fontWeight: 600 }}>{evt.actor}</td>
                <td>{evt.resource}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{evt.ip}</td>
                <td style={{ fontSize: '12px', color: '#64748b' }}>{evt.time}</td>
                <td style={{ fontSize: '13px', color: '#475569' }}>{evt.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, X } from 'lucide-react';

export function DisputeModal({ dispute, onClose, onResolve }) {
  const [resolutionType, setResolutionType] = useState('REFUND_BUYER');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!dispute) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onResolve(dispute.id, resolutionType, notes);
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle color="#ef4444" size={20} />
            <h3 style={{ fontSize: '17px' }}>Arbitrage Litige — #{dispute.order?.order_number || dispute.order_id}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Motif du litige :</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{dispute.reason} — {dispute.description}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Acheteur : {dispute.buyer_name} | Vendeur : {dispute.merchant_name}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                Décision de l’Administrateur :
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${resolutionType === 'REFUND_BUYER' ? '#00a86b' : '#e2e8f0'}`,
                    backgroundColor: resolutionType === 'REFUND_BUYER' ? '#e8f8f2' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="REFUND_BUYER"
                    checked={resolutionType === 'REFUND_BUYER'}
                    onChange={() => setResolutionType('REFUND_BUYER')}
                    style={{ accentColor: '#00a86b' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Rembourser l’Acheteur</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Fonds réinjectés sur son solde</div>
                  </div>
                </label>

                <label
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${resolutionType === 'RELEASE_MERCHANT' ? '#00a86b' : '#e2e8f0'}`,
                    backgroundColor: resolutionType === 'RELEASE_MERCHANT' ? '#e8f8f2' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="RELEASE_MERCHANT"
                    checked={resolutionType === 'RELEASE_MERCHANT'}
                    onChange={() => setResolutionType('RELEASE_MERCHANT')}
                    style={{ accentColor: '#00a86b' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Libérer au Vendeur</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Paiement débloqué</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Justification & Notes de Clôture (Visible dans l'audit) :
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Examen des preuves conclu en faveur du client suite à la non-conformité avérée."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Traitement...' : 'Appliquer la Décision Finale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

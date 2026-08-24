import React from 'react';

export function StatCard({ title, value, icon: Icon, color, bgColor, subtitle }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>}
      </div>
      <div className="stat-icon-wrapper" style={{ backgroundColor: bgColor, color }}>
        <Icon size={24} />
      </div>
    </div>
  );
}

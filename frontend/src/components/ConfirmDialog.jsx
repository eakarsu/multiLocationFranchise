import React from 'react';
import { FiAlertTriangle, FiTrash2, FiEdit2, FiInfo } from 'react-icons/fi';

const ConfirmDialog = ({ isOpen, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const icons = {
    danger: <FiTrash2 size={24} />,
    warning: <FiAlertTriangle size={24} />,
    info: <FiInfo size={24} />,
    edit: <FiEdit2 size={24} />
  };

  const colors = {
    danger: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', btn: 'btn-danger' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', btn: 'btn-primary' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--info)', btn: 'btn-primary' },
    edit: { bg: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', btn: 'btn-primary' }
  };

  const v = variant || 'danger';
  const c = colors[v];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: c.bg,
            color: c.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            {icons[v]}
          </div>
          <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{title || 'Confirm Action'}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {message || 'Are you sure you want to proceed?'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onCancel}>
              {cancelLabel || 'Cancel'}
            </button>
            <button className={`btn ${c.btn}`} onClick={onConfirm}>
              {confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

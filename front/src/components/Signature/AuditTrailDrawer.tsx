import React, { useEffect, useState } from 'react';
import { X, Shield, ShieldCheck, Loader2, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { signatureAPI } from '../../api';

interface AuditItem {
  id: number;
  reportId: string;
  superviseurId: string;
  signerName: string;
  pdfHashOriginal: string;
  pdfHashSigned: string;
  certificateThumbprint: string;
  signedAt: string;
  action: string;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditTrailDrawerProps {
  reportId: string;
  open: boolean;
  onClose: () => void;
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  SIGN: { label: 'Signature', color: '#16a34a' },
  VERIFY: { label: 'Vérification', color: '#2563eb' },
  REVOKE: { label: 'Révocation', color: '#dc2626' },
};

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({
  reportId,
  open,
  onClose,
}) => {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    signatureAPI
      .getAuditTrail(reportId)
      .then((res) => setItems(res.data.items))
      .catch(() => toast.error('Erreur lors du chargement de la piste d\'audit'))
      .finally(() => setLoading(false));
  }, [open, reportId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sign-drawer-overlay">
      <div className="sign-drawer" role="dialog" aria-modal="true">
        <div className="sign-drawer-header">
          <div className="sign-modal-title">
            <Shield size={18} />
            <span>Piste d'audit — signature</span>
          </div>
          <button className="sign-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="sign-drawer-body">
          {loading ? (
            <div className="sign-verify-loading">
              <Loader2 size={22} className="sign-spin" />
              <span>Chargement...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="sign-audit-empty">
              <FileText size={28} />
              <span>Aucune signature enregistrée pour ce rapport</span>
            </div>
          ) : (
            <div className="sign-timeline">
              {items.map((item) => {
                const meta = ACTION_META[item.action] || {
                  label: item.action,
                  color: '#64748b',
                };
                return (
                  <div key={item.id} className="sign-timeline-item">
                    <div className="sign-timeline-dot" style={{ background: meta.color }}>
                      {item.action === 'SIGN' ? <ShieldCheck size={12} /> : null}
                    </div>
                    <div className="sign-timeline-card">
                      <div className="sign-timeline-top">
                        <span className="sign-timeline-action" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="sign-timeline-date">
                          {new Date(item.signedAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="sign-timeline-signer">{item.signerName}</div>
                      <div className="sign-timeline-meta">
                        {item.ipAddress ? <span>IP: {item.ipAddress}</span> : null}
                        <span title={item.certificateThumbprint}>
                          Thumbprint:{' '}
                          {item.certificateThumbprint
                            ? `${item.certificateThumbprint.slice(0, 20)}...`
                            : '—'}
                        </span>
                      </div>
                      <div className="sign-timeline-hashes">
                        <span title={item.pdfHashOriginal}>PDF origine: {item.pdfHashOriginal.slice(0, 12)}...</span>
                        <span title={item.pdfHashSigned}>PDF signé: {item.pdfHashSigned.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
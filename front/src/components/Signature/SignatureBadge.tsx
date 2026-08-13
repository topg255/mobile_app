import React, { useRef, useState } from 'react';
import { Shield, ShieldCheck, BadgeCheck, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { signatureAPI } from '../../api';
import { AuditTrailDrawer } from './AuditTrailDrawer';

interface SignatureBadgeProps {
  reportId: string;
  isSigned: boolean;
  signedAt?: string;
  signerName?: string;
  onSign?: () => void;
}

interface VerifyState {
  verifying: boolean;
  result: {
    isValid: boolean;
    signedAt: string;
    signerName: string;
    timestampValid: boolean;
    auditTrailId: string;
    details: string[];
  } | null;
}

export const SignatureBadge: React.FC<SignatureBadgeProps> = ({
  reportId,
  isSigned,
  signedAt,
  signerName,
  onSign,
}) => {
  const [signing, setSigning] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verify, setVerify] = useState<VerifyState>({ verifying: false, result: null });
  const [auditOpen, setAuditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSign = async () => {
    setSigning(true);
    try {
      const res = await signatureAPI.sign(reportId);
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${reportId}-signe.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Rapport signé avec succès — PDF téléchargé');
      onSign?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  const handleVerifyFile = async (file: File) => {
    setVerify({ verifying: true, result: null });
    try {
      const res = await signatureAPI.verify(file, reportId);
      setVerify({ verifying: false, result: res.data });
    } catch (e: any) {
      const data = e.response?.data;
      setVerify({
        verifying: false,
        result: data && Array.isArray(data.details)
          ? { ...data, auditTrailId: '', signedAt: '', signerName: '', timestampValid: false }
          : {
              isValid: false,
              signedAt: '',
              signerName: '',
              timestampValid: false,
              auditTrailId: '',
              details: [data?.message || 'Erreur lors de la vérification'],
            },
      });
    }
  };

  const closeVerify = () => {
    setVerifyOpen(false);
    setVerify({ verifying: false, result: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isSigned) {
    return (
      <button
        className="sign-btn sign-btn-primary"
        onClick={handleSign}
        disabled={signing}
        title="Signer numériquement ce rapport"
      >
        {signing ? <Loader2 size={15} className="sign-spin" /> : <Shield size={15} />}
        {signing ? 'Signature en cours...' : 'Signer ce rapport'}
      </button>
    );
  }

  return (
    <>
      <div className="sign-badge">
        <ShieldCheck size={16} />
        <span className="sign-badge-text">
          Signé par <strong>{signerName || 'Inconnu'}</strong>
          {signedAt ? (
            <>
              {' '}
              le{' '}
              {new Date(signedAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              à{' '}
              {new Date(signedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </>
          ) : null}
        </span>
        <button className="sign-badge-btn" onClick={() => setVerifyOpen(true)}>
          <BadgeCheck size={14} /> Vérifier
        </button>
        <button className="sign-badge-btn" onClick={() => setAuditOpen(true)}>
          <Shield size={14} /> Audit
        </button>
      </div>

      {verifyOpen && (
        <div
          className="sign-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeVerify();
          }}
        >
          <div className="sign-modal">
            <div className="sign-modal-header">
              <div className="sign-modal-title">
                <ShieldCheck size={18} />
                <span>Vérification de la signature</span>
              </div>
              <button className="sign-modal-close" onClick={closeVerify}>
                <X size={16} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVerifyFile(file);
              }}
            />

            {!verify.result && !verify.verifying && (
              <button
                className="sign-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Shield size={22} />
                <span>
                  Téléverser le PDF <strong>signé</strong> à vérifier
                </span>
                <small>Parcourir les fichiers...</small>
              </button>
            )}

            {verify.verifying && (
              <div className="sign-verify-loading">
                <Loader2 size={22} className="sign-spin" />
                <span>Vérification en cours...</span>
              </div>
            )}

            {verify.result && (
              <div className="sign-verify-result">
                <div className={`sign-verdict ${verify.result.isValid ? 'sign-verdict-ok' : 'sign-verdict-bad'}`}>
                  {verify.result.isValid ? <ShieldCheck size={20} /> : <X size={20} />}
                  {verify.result.isValid ? 'Signature valide' : 'Signature invalide'}
                </div>
                {verify.result.auditTrailId && (
                  <div className="sign-verify-meta">
                    Audit #<strong>{verify.result.auditTrailId}</strong> ·{' '}
                    {verify.result.signerName} ·{' '}
                    {verify.result.signedAt
                      ? new Date(verify.result.signedAt).toLocaleString('fr-FR')
                      : ''}
                  </div>
                )}
                <ul className="sign-details">
                  {verify.result.details.map((d, i) => {
                    const ok =
                      !d.startsWith('ATTENTION') &&
                      !d.includes('invalide') &&
                      !d.includes('incomplet') &&
                      !d.includes('incohérent') &&
                      !d.includes('ne correspond');
                    return (
                      <li key={i} className={ok ? 'sign-detail-ok' : 'sign-detail-bad'}>
                        <span className="sign-detail-icon">{ok ? '✓' : '✗'}</span>
                        {d}
                      </li>
                    );
                  })}
                </ul>
                <button className="sign-modal-ok" onClick={closeVerify}>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AuditTrailDrawer
        reportId={reportId}
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
      />
    </>
  );
};
import { useCallback, useEffect, useRef, useState } from 'react';
import { signaturePadAPI } from '../../api';
import { SuperviseurSignature } from '../../types';
import SignatureDrawer, { SignatureDrawerHandle } from './SignatureDrawer';
import { toast } from 'react-hot-toast';
import './Signature.css';

const qualityLabel = (q: number | null): string => {
  if (q === null) return 'Non mesuree';
  if (q >= 80) return 'Excellente';
  if (q >= 60) return 'Bonne';
  if (q >= 40) return 'Moyenne';
  return 'Faible';
};

const qualityColor = (q: number | null): string => {
  if (q === null) return '#64748b';
  if (q >= 80) return '#16a34a';
  if (q >= 60) return '#2563eb';
  if (q >= 40) return '#d97706';
  return '#dc2626';
};

const toDataUrl = (base64: string): string => `data:image/png;base64,${base64}`;

const SignaturePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState<SuperviseurSignature | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const drawerRef = useRef<SignatureDrawerHandle | null>(null);

  const refreshMine = useCallback(async () => {
    const { data } = await signaturePadAPI.getMine();
    setSignature(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshMine()
      .catch(() => {
        if (!cancelled) toast.error('Impossible de charger votre signature');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshMine]);

  useEffect(() => {
    if (uploadedId === null) return;
    let cancelled = false;
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries += 1;
      if (cancelled) return;
      try {
        const { data } = await signaturePadAPI.getStatus(uploadedId);
        if (data.processingStatus === 'completed') {
          window.clearInterval(timer);
          setPollStatus(null);
          await refreshMine();
          setUploadedId(null);
          setReplaceMode(false);
          toast.success('Signature enregistree et optimisee');
        } else if (data.processingStatus === 'failed') {
          window.clearInterval(timer);
          setPollStatus(null);
          setUploadedId(null);
          setReplaceMode(false);
          toast.error("Optimisation impossible — la signature d'origine a ete conservee");
        } else if (tries > 45) {
          window.clearInterval(timer);
          setPollStatus(null);
          setUploadedId(null);
          setReplaceMode(false);
          await refreshMine();
          toast.success('Signature enregistree');
        } else {
          setPollStatus(
            tries > 4
              ? 'Optimisation en cours (IA) — patientez quelques secondes...'
              : 'Enregistrement en cours...'
          );
        }
      } catch {
        // keep polling silently
      }
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [uploadedId, refreshMine]);

  const handleValidate = async () => {
    const sig = drawerRef.current?.exportSignature();
    if (!sig) {
      toast.error('Veillez signer dans la zone prevue');
      return;
    }
    setPollStatus('Envoi de la signature...');
    try {
      const { data } = await signaturePadAPI.uploadAsJson(
        sig.base64,
        sig.width,
        sig.height
      );
      setUploadedId(data.id);
      setPollStatus('Enregistrement en cours...');
    } catch {
      setPollStatus(null);
      toast.error('Erreur lors de l\u2019envoi de la signature');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer definitivement votre signature ?')) return;
    try {
      await signaturePadAPI.remove();
      setSignature(null);
      setReplaceMode(false);
      toast.success('Signature supprimee');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = () => {
    if (!signature) return;
    const url = toDataUrl(signature.enhancedImageBase64 ?? signature.originalImageBase64);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ma-signature.png';
    link.click();
  };

  if (loading) {
    return <div className="signature-page-loading">Chargement de la signature...</div>;
  }

  const showDrawer = !signature || replaceMode;

  return (
    <div className="signature-page">
      <div className="signature-header">
        <div>
          <h2 className="signature-title">Ma signature numerique</h2>
          <p className="signature-subtitle">
            Votre signature manuscrite est apposee automatiquement sur les
            rapports qualite (PDF et e-mail) que vous envoyez chaque jour.
          </p>
        </div>
        {signature && !replaceMode && (
          <button
            type="button"
            className="sig-btn sig-btn-ghost"
            onClick={() => setReplaceMode(true)}
          >
            Remplacer ma signature
          </button>
        )}
      </div>

      {showDrawer ? (
        <div className="signature-card">
          <div className="signature-card-title">
            {signature ? 'Nouvelle signature' : 'Creez votre signature'}
          </div>
          <SignatureDrawer
            ref={drawerRef}
            previewMode={uploadedId !== null}
          />
          <div className="signature-actions">
            <button
              type="button"
              className="sig-btn sig-btn-primary"
              onClick={handleValidate}
              disabled={uploadedId !== null}
            >
              {uploadedId !== null ? 'Traitement en cours...' : 'Valider la signature'}
            </button>
            {signature && (
              <button
                type="button"
                className="sig-btn sig-btn-ghost"
                onClick={() => {
                  setReplaceMode(false);
                  drawerRef.current?.clear();
                }}
              >
                Annuler
              </button>
            )}
          </div>
          {pollStatus && (
            <div className="signature-poll-status">
              <span className="signature-poll-spinner" />
              {pollStatus}
            </div>
          )}
        </div>
      ) : (
        signature && (
          <div className="signature-card">
            <div className="signature-card-title">Signature actuelle</div>
            <div className="signature-current">
              <img
                src={toDataUrl(
                  signature.enhancedImageBase64 ?? signature.originalImageBase64
                )}
                alt="Votre signature"
                className="signature-current-img"
              />
            </div>
            <div className="signature-meta-grid">
              <div className="signature-meta-item">
                <span className="signature-meta-label">Qualite estimee</span>
                <span
                  className="signature-meta-value"
                  style={{ color: qualityColor(signature.quality) }}
                >
                  {signature.quality !== null ? `${signature.quality}/100` : '--'}
                  <span className="signature-meta-sub">{qualityLabel(signature.quality)}</span>
                </span>
              </div>
              <div className="signature-meta-item">
                <span className="signature-meta-label">Statut</span>
                <span className="signature-meta-value">
                  <span className="signature-status-badge">Active</span>
                </span>
              </div>
              <div className="signature-meta-item">
                <span className="signature-meta-label">Enregistree le</span>
                <span className="signature-meta-value">
                  {new Date(signature.updatedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="signature-meta-item">
                <span className="signature-meta-label">Vectorisation IA</span>
                <span className="signature-meta-value">
                  {signature.svgPath ? 'SVG genere' : 'Non vectorisee'}
                </span>
              </div>
            </div>
            {signature.improvements && (
              <div className="signature-improvements">
                <span className="signature-improvements-title">
                  Ameliorations appliquees
                </span>
                <ul className="signature-improvements-list">
                  {signature.improvements
                    .split('; ')
                    .filter(Boolean)
                    .map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                </ul>
              </div>
            )}
            <div className="signature-actions">
              <button type="button" className="sig-btn sig-btn-secondary" onClick={handleDownload}>
                Telecharger (PNG)
              </button>
              <button type="button" className="sig-btn sig-btn-danger" onClick={handleDelete}>
                Supprimer ma signature
              </button>
            </div>
          </div>
        )
      )}

      <div className="signature-howto">
        <div className="signature-howto-title">Comment ca fonctionne ?</div>
        <div className="signature-howto-grid">
          <div className="signature-howto-card">
            <span className="signature-howto-step">1</span>
            <div className="signature-howto-body">
              <strong>Signez</strong>
              <p>Tracez votre signature manuscrite dans la zone prevue.</p>
            </div>
          </div>
          <div className="signature-howto-card">
            <span className="signature-howto-step">2</span>
            <div className="signature-howto-body">
              <strong>Optimisation automatique</strong>
              <p>
                Le systeme nettoie l'image et mesure sa qualite (lisibilite,
                continuite des traits).
              </p>
            </div>
          </div>
          <div className="signature-howto-card">
            <span className="signature-howto-step">3</span>
            <div className="signature-howto-body">
              <strong>Signature des rapports</strong>
              <p>
                Elle est apposee sur vos rapports PDF et inseree dans vos e-mails
                quotidiens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePage;
import { useState, useEffect } from 'react';
import { capaAPI } from '../../api';
import { CapaTypeValue, CapaPriority, User } from '../../types';
import { toast } from 'react-hot-toast';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ligneControleId?: string;
  nomLigne?: string;
}

export default function CapaFormModal({ open, onClose, onSaved, ligneControleId, nomLigne }: Props) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CapaTypeValue>('corrective');
  const [priority, setPriority] = useState<CapaPriority>('moyenne');
  const [dateEcheance, setDateEcheance] = useState('');
  const [causeRacine, setCauseRacine] = useState('');
  const [coutEstime, setCoutEstime] = useState('');
  const [nomLigneInput, setNomLigneInput] = useState(nomLigne || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (nomLigne) setNomLigneInput(nomLigne);
  }, [nomLigne]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!titre.trim() || !description.trim() || !dateEcheance) {
      toast.error('Titre, description et date d\'échéance sont requis');
      return;
    }
    setSaving(true);
    try {
      await capaAPI.create({
        titre: titre.trim(),
        description: description.trim(),
        type,
        priority,
        dateEcheance,
        ligneControleId,
        nomLigne: nomLigneInput || undefined,
        causeRacine: causeRacine || undefined,
        coutEstime: coutEstime ? parseFloat(coutEstime) : undefined,
      });
      toast.success('CAPA créé avec succès');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const TYPE_OPTIONS: { value: CapaTypeValue; label: string; color: string }[] = [
    { value: 'corrective', label: 'Corrective', color: '#DC2626' },
    { value: 'preventive', label: 'Préventive', color: '#2563EB' },
    { value: 'les_deux', label: 'Les deux', color: '#7C3AED' },
  ];

  const PRIORITY_OPTIONS: { value: CapaPriority; label: string; bg: string; color: string }[] = [
    { value: 'faible', label: 'Faible', bg: '#F3F4F6', color: '#374151' },
    { value: 'moyenne', label: 'Moyenne', bg: '#DBEAFE', color: '#1E40AF' },
    { value: 'haute', label: 'Haute', bg: '#FEF3C7', color: '#92400E' },
    { value: 'critique', label: 'Critique', bg: '#FEE2E2', color: '#991B1B' },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700,
          maxHeight: '90vh', overflow: 'auto', padding: 28, position: 'relative',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
        >
          <X size={20} />
        </button>

        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} color="#F59E0B" /> Nouveau CAPA
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Colonne 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Défaut sertissage récurrent ligne L-07"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setType(o.value)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: `2px solid ${type === o.value ? o.color : '#e2e8f0'}`,
                      background: type === o.value ? `${o.color}11` : '#fff',
                      color: type === o.value ? o.color : '#64748b',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Priorité</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setPriority(o.value)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8,
                      border: `2px solid ${priority === o.value ? o.color : '#e2e8f0'}`,
                      background: priority === o.value ? o.bg : '#fff',
                      color: priority === o.value ? o.color : '#64748b',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      animation: priority === o.value && o.value === 'critique' ? 'capaPulse 1.5s infinite' : undefined,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <style>{`@keyframes capaPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } }`}</style>
            </div>

            <div>
              <label style={labelStyle}>Date d'échéance *</label>
              <input
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Coût estimé (€)</label>
              <input
                type="number"
                value={coutEstime}
                onChange={(e) => setCoutEstime(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ligne concernée</label>
              <input
                value={nomLigneInput}
                onChange={(e) => setNomLigneInput(e.target.value)}
                placeholder="Nom de la ligne"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Colonne 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Description du problème *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le problème constaté..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
              />
            </div>

            <div>
              <label style={labelStyle}>Cause racine initiale</label>
              <textarea
                value={causeRacine}
                onChange={(e) => setCauseRacine(e.target.value)}
                placeholder="Si connue, sinon l'IA analysera automatiquement"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
              />
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: 12, fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
              L'IA va générer une analyse de cause racine automatiquement après création du CAPA.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !titre.trim() || !description.trim() || !dateEcheance}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || !titre.trim() || !description.trim() || !dateEcheance ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Créer le CAPA
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 13, fontFamily: 'inherit', color: '#1e293b', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};
import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Trash2, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

const VARIANT_CONFIG = {
  danger: {
    Icon: Trash2,
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    confirmBg: '#DC2626',
    confirmHover: '#B91C1C',
    confirmText: '#FFFFFF',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    confirmBg: '#D97706',
    confirmHover: '#B45309',
    confirmText: '#FFFFFF',
  },
  info: {
    Icon: Info,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    confirmBg: '#2563EB',
    confirmHover: '#1D4ED8',
    confirmText: '#FFFFFF',
  },
  success: {
    Icon: CheckCircle,
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    confirmBg: '#16A34A',
    confirmHover: '#15803D',
    confirmText: '#FFFFFF',
  },
};

export function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
}: ConfirmModalProps) {
  const cfg = VARIANT_CONFIG[variant];
  const { Icon } = cfg;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '36px 28px 28px',
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
          animation: 'scaleIn 0.2s ease-out',
        }}
      >
        {/* Icône */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: cfg.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '22px',
            flexShrink: 0,
          }}
        >
          <Icon size={28} color={cfg.iconColor} strokeWidth={1.8} />
        </div>

        {/* Titre — couleur forcée #111827, jamais grise */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            textAlign: 'center',
            margin: '0 0 10px 0',
            lineHeight: '1.3',
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '14px',
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: '1.65',
            margin: '0 0 28px 0',
            maxWidth: '340px',
          }}
        >
          {message}
        </p>

        {/* Séparateur */}
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: '#F3F4F6',
            marginBottom: '20px',
          }}
        />

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: '12px',
              border: '1.5px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F4F6';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9FAFB';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
            }}
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: cfg.confirmBg,
              color: cfg.confirmText,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.15s, transform 0.1s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = cfg.confirmHover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = cfg.confirmBg;
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
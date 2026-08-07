import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<
  ConfirmVariant,
  { icon: LucideIcon; iconWrap: string; confirmBtn: string }
> = {
  danger: {
    icon: Trash2,
    iconWrap: 'bg-red-100 text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-100 text-amber-600',
    confirmBtn: 'bg-orange-500 hover:bg-orange-600',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-blue-100 text-blue-600',
    confirmBtn: 'bg-blue-700 hover:bg-blue-800',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-green-100 text-green-600',
    confirmBtn: 'bg-green-600 hover:bg-green-700',
  },
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  icon,
}) => {
  const [show, setShow] = useState(false);
  const styles = VARIANT_STYLES[variant];
  const Icon = icon ?? <styles.icon size={24} />;

  useEffect(() => {
    if (open) {
      setShow(false);
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-200 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={`w-full max-w-[420px] rounded-2xl bg-[#FAFAFA] p-8 shadow-2xl transition-all duration-200 ease-out ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${styles.iconWrap}`}
        >
          {Icon}
        </div>
        <h2 className="mt-4 text-center text-[18px] font-bold text-[#111827]">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-[#6B7280]">
          {message}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmModal;

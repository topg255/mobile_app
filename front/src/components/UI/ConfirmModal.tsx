import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
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
}

const VARIANT_STYLES: Record<
  ConfirmVariant,
  { icon: LucideIcon; iconWrap: string; confirmBtn: string }
> = {
  danger: {
    icon: Trash2,
    iconWrap: 'bg-red-50 text-red-600',
    confirmBtn: 'bg-red-600 text-white hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-50 text-amber-600',
    confirmBtn: 'bg-amber-500 text-white hover:bg-amber-600',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-blue-50 text-blue-600',
    confirmBtn: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle,
    iconWrap: 'bg-green-50 text-green-600',
    confirmBtn: 'bg-green-600 text-white hover:bg-green-700',
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
}) => {
  const [show, setShow] = useState(false);
  const styles = VARIANT_STYLES[variant];
  const Icon = <styles.icon size={26} />;

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
        className={`flex w-full max-w-[400px] flex-col items-center rounded-[20px] border-[0.5px] border-gray-200 bg-white px-7 pb-6 pt-8 shadow-2xl transition-all duration-200 ease-out ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className={`flex h-[60px] w-[60px] items-center justify-center rounded-full ${styles.iconWrap}`}
        >
          {Icon}
        </div>
        <h2 className="mt-4 text-center text-[17px] font-medium text-[#111827]">
          {title}
        </h2>
        <p className="mb-7 mt-2 text-center text-[13.5px] leading-[1.6] text-[#6B7280]">
          {message}
        </p>
        <hr className="mb-5 w-full border-[0.5px] border-gray-200" />
        <div className="flex w-full gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[12px] border-[0.5px] border-gray-300 bg-gray-100 py-[11px] text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-[12px] py-[11px] text-sm font-medium transition-colors ${styles.confirmBtn}`}
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

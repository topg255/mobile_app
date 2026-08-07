import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import type { ConfirmVariant } from './ConfirmModal';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: ConfirmVariant;
}

const VARIANT_STYLES: Record<
  ConfirmVariant,
  { icon: LucideIcon; iconWrap: string }
> = {
  danger: { icon: Trash2, iconWrap: 'bg-red-100 text-red-600' },
  warning: { icon: AlertTriangle, iconWrap: 'bg-amber-100 text-amber-600' },
  info: { icon: Info, iconWrap: 'bg-blue-100 text-blue-600' },
  success: { icon: CheckCircle2, iconWrap: 'bg-green-100 text-green-600' },
};

const AlertModal: React.FC<AlertModalProps> = ({
  open,
  onClose,
  title,
  message,
  variant = 'info',
}) => {
  const [show, setShow] = useState(false);
  const styles = VARIANT_STYLES[variant];
  const Icon = <styles.icon size={24} />;

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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-200 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[140px] rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
          >
            Compris
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AlertModal;

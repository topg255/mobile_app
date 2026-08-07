import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
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
  danger: { icon: Trash2, iconWrap: 'bg-red-50 text-red-600' },
  warning: { icon: AlertTriangle, iconWrap: 'bg-amber-50 text-amber-600' },
  info: { icon: Info, iconWrap: 'bg-blue-50 text-blue-600' },
  success: { icon: CheckCircle, iconWrap: 'bg-green-50 text-green-600' },
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
        <div className="flex w-full justify-center">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[140px] rounded-[12px] bg-blue-600 py-[11px] text-sm font-medium text-white transition-colors hover:bg-blue-700"
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

import { useCallback, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ConfirmModal, {
  type ConfirmVariant,
} from '../components/UI/ConfirmModal';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export function useConfirm() {
  const rootRef = useRef<Root | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      rootRef.current = root;
      document.body.appendChild(container);

      const close = (result: boolean) => {
        resolve(result);
        root.unmount();
        container.remove();
        if (rootRef.current === root) rootRef.current = null;
      };

      root.render(
        <ConfirmModal
          open
          title={options.title}
          message={options.message}
          confirmLabel={options.confirmLabel}
          cancelLabel={options.cancelLabel}
          variant={options.variant}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />,
      );
    });
  }, []);

  return confirm;
}

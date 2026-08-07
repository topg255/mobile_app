import { useCallback, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import AlertModal from '../components/UI/AlertModal';
import type { ConfirmVariant } from '../components/UI/ConfirmModal';

export interface AlertOptions {
  title: string;
  message: string;
  variant?: ConfirmVariant;
}

export function useAlert() {
  const rootRef = useRef<Root | null>(null);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      rootRef.current = root;
      document.body.appendChild(container);

      const close = () => {
        resolve();
        root.unmount();
        container.remove();
        if (rootRef.current === root) rootRef.current = null;
      };

      root.render(
        <AlertModal
          open
          title={options.title}
          message={options.message}
          variant={options.variant}
          onClose={close}
        />,
      );
    });
  }, []);

  return alert;
}

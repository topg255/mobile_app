import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import SignaturePad from 'signature_pad';
import { LocalSignature } from '../../types';

export interface SignatureDrawerProps {
  onSignatureChange?: (sig: LocalSignature | null) => void;
  penColor?: string;
  penThickness?: number;
  previewMode?: boolean;
}

export interface SignatureDrawerHandle {
  exportSignature: () => LocalSignature | null;
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 180;

const COLOR_CHOICES = ['#1e293b', '#2563eb', '#dc2626'];

const SignatureDrawer = forwardRef<SignatureDrawerHandle, SignatureDrawerProps>(
  (
    { onSignatureChange, penColor = '#1e293b', penThickness = 2.5, previewMode = false },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const padRef = useRef<SignaturePad | null>(null);
    const debounceRef = useRef<number | null>(null);
    const onChangeRef = useRef(onSignatureChange);
    const [color, setColor] = useState(penColor);
    const [thickness, setThickness] = useState(penThickness);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
      onChangeRef.current = onSignatureChange;
    }, [onSignatureChange]);

    const applyPenSettings = useCallback((nextColor: string, nextThickness: number) => {
      const pad = padRef.current;
      if (!pad) return;
      pad.penColor = nextColor;
      pad.minWidth = nextThickness * 0.2;
      pad.maxWidth = nextThickness;
    }, []);

    const emitCurrent = useCallback(() => {
      const pad = padRef.current;
      if (!pad) return;
      if (pad.isEmpty()) {
        setIsEmpty(true);
        setPreviewUrl(null);
        onChangeRef.current?.(null);
        return;
      }
      setIsEmpty(false);
      const canvasEl = canvasRef.current;
      const dataUrl = pad.toDataURL('image/png', 1);
      const base64 = dataUrl.split(',')[1] ?? '';
      if (base64.length < 64) {
        onChangeRef.current?.(null);
        return;
      }
      if (previewMode) setPreviewUrl(dataUrl);
      onChangeRef.current?.({
        base64,
        width: canvasEl?.width ?? CANVAS_WIDTH,
        height: canvasEl?.height ?? CANVAS_HEIGHT,
      });
    }, [previewMode]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      const pad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255,255,255,0)',
        penColor,
        minWidth: penThickness * 0.2,
        maxWidth: penThickness,
      });
      padRef.current = pad;

      const handleStrokeEnd = () => {
        if (debounceRef.current !== null) {
          window.clearTimeout(debounceRef.current);
        }
        debounceRef.current = window.setTimeout(() => emitCurrent(), 500);
      };

      canvas.addEventListener('pointerup', handleStrokeEnd);
      return () => {
        canvas.removeEventListener('pointerup', handleStrokeEnd);
        if (debounceRef.current !== null) {
          window.clearTimeout(debounceRef.current);
        }
        padRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClear = useCallback(() => {
      const pad = padRef.current;
      if (!pad) return;
      pad.clear();
      setIsEmpty(true);
      setPreviewUrl(null);
      onChangeRef.current?.(null);
    }, []);

    const handleUndo = useCallback(() => {
      const pad = padRef.current;
      if (!pad) return;
      const data = pad.toData();
      if (data && data.length > 0) {
        data.pop();
        pad.fromData(data);
      }
      emitCurrent();
    }, [emitCurrent]);

    useImperativeHandle(
      ref,
      () => ({
        exportSignature: () => {
          const pad = padRef.current;
          if (!pad || pad.isEmpty()) return null;
          const canvasEl = canvasRef.current;
          const dataUrl = pad.toDataURL('image/png', 1);
          const base64 = dataUrl.split(',')[1] ?? '';
          if (base64.length < 64) return null;
          return {
            base64,
            width: canvasEl?.width ?? CANVAS_WIDTH,
            height: canvasEl?.height ?? CANVAS_HEIGHT,
          };
        },
        clear: handleClear,
        getCanvas: () => canvasRef.current,
      }),
      [handleClear]
    );

    const changeColor = (next: string) => {
      setColor(next);
      applyPenSettings(next, thickness);
    };

    const changeThickness = (next: number) => {
      setThickness(next);
      applyPenSettings(color, next);
    };

    return (
      <div className="sig-drawer">
        <div className="sig-toolbar">
          <div className="sig-toolbar-group">
            <span className="sig-toolbar-label">Epaisseur</span>
            {[1, 2, 3, 4, 5].map((t) => (
              <button
                key={t}
                type="button"
                className={`sig-thickness-btn ${thickness === t ? 'active' : ''}`}
                onClick={() => changeThickness(t)}
                title={`Epaisseur ${t}`}
              >
                <span className="sig-thickness-dot" style={{ width: 4 + t * 2, height: 4 + t * 2 }} />
              </button>
            ))}
          </div>
          <div className="sig-toolbar-group">
            <span className="sig-toolbar-label">Couleur</span>
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className={`sig-color-btn ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => changeColor(c)}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
          <div className="sig-toolbar-actions">
            <button type="button" className="sig-tool-btn" onClick={handleUndo}>
              Annuler trait
            </button>
            <button type="button" className="sig-tool-btn" onClick={handleClear}>
              Effacer
            </button>
          </div>
        </div>

        <div className="sig-canvas-wrap">
          <canvas ref={canvasRef} className="sig-canvas" />
          <span className="sig-baseline-label">Signez ici</span>
        </div>

        {previewMode && (
          <div className="sig-corrected-preview">
            <span className="sig-corrected-preview-title">
              Apercu de la signature
            </span>
            {previewUrl ? (
              <img src={previewUrl} alt="Apercu de la signature" className="sig-corrected-preview-img" />
            ) : (
              <span className="sig-corrected-preview-empty">En attente de signature...</span>
            )}
          </div>
        )}
        {isEmpty && !previewMode && (
          <p className="sig-hint">Tracez votre signature dans la zone ci-dessus</p>
        )}
      </div>
    );
  }
);

SignatureDrawer.displayName = 'SignatureDrawer';

export default SignatureDrawer;
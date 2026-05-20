import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { DragEvent as RDE, MouseEvent as RME, CSSProperties } from 'react';
import type { Placement, CollageSettings, PhotoOffset, PhotoNatSize } from '../types';

export interface CollageCanvasHandle {
  getOffsets(): Map<string, PhotoOffset>;
  getNatSizes(): Map<string, PhotoNatSize>;
}

interface Props {
  placements: Placement[];
  settings: CollageSettings;
  layoutRevision: number;
  onPhotosAdded: (files: File[]) => void;
  onRemovePhoto: (id: string) => void;
  onSwapPhotos: (id1: string, id2: string) => void;
  hasPhotos: boolean;
}

interface PanDrag {
  photoId: string; startMX: number; startMY: number;
  startOX: number; startOY: number; maxPX: number; maxPY: number; didMove: boolean;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function computePanInfo(fw: number, fh: number, nat: PhotoNatSize | undefined, off: PhotoOffset) {
  if (!nat || nat.w === 0 || nat.h === 0) return { imgW: fw, imgH: fh, imgLeft: 0, imgTop: 0, maxPX: 0, maxPY: 0 };
  const s = Math.max(fw / nat.w, fh / nat.h);
  const iw = nat.w * s; const ih = nat.h * s;
  const mpx = Math.max(0, (iw - fw) / 2); const mpy = Math.max(0, (ih - fh) / 2);
  return { imgW: iw, imgH: ih, maxPX: mpx, maxPY: mpy,
    imgLeft: (fw - iw) / 2 + clamp(off.x, -mpx, mpx), imgTop: (fh - ih) / 2 + clamp(off.y, -mpy, mpy) };
}

const CollageCanvas = forwardRef<CollageCanvasHandle, Props>(function CollageCanvas(
  { placements, settings, layoutRevision, onPhotosAdded, onRemovePhoto, onSwapPhotos, hasPhotos }, ref,
) {
  const [isDropping, setIsDropping] = useState(false);
  const dropCounter = useRef(0);
  const [offsets, setOffsets] = useState<Map<string, PhotoOffset>>(new Map());
  const [natSizes, setNatSizes] = useState<Map<string, PhotoNatSize>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const panDrag = useRef<PanDrag | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const onSwapRef = useRef(onSwapPhotos);
  useEffect(() => { onSwapRef.current = onSwapPhotos; }, [onSwapPhotos]);

  // Expose current offsets and natSizes to the parent for export
  useImperativeHandle(ref, () => ({
    getOffsets: () => offsets,
    getNatSizes: () => natSizes,
  }), [offsets, natSizes]);

  // Full reset on regenerate / settings change / add photos — NOT on swap
  useEffect(() => { setOffsets(new Map()); setSelectedId(null); selectedIdRef.current = null; }, [layoutRevision]);

  // Swap-safe cleanup: only drop offsets for photos that left the layout
  useEffect(() => {
    const ids = new Set(placements.map(p => p.photo.id));
    setOffsets(prev => {
      let changed = false;
      const m = new Map(prev);
      for (const id of m.keys()) { if (!ids.has(id)) { m.delete(id); changed = true; } }
      return changed ? m : prev;
    });
  }, [placements]);

  // Global mouse handlers for pan dragging
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panDrag.current) return;
      const d = panDrag.current;
      if (!d.didMove && (Math.abs(e.clientX - d.startMX) > 4 || Math.abs(e.clientY - d.startMY) > 4)) d.didMove = true;
      if (!d.didMove) return;
      const dx = d.maxPX > 0 ? e.clientX - d.startMX : 0;
      const dy = d.maxPY > 0 ? e.clientY - d.startMY : 0;
      setOffsets(prev => {
        const m = new Map(prev);
        m.set(d.photoId, { x: clamp(d.startOX + dx, -d.maxPX, d.maxPX), y: clamp(d.startOY + dy, -d.maxPY, d.maxPY) });
        return m;
      });
    };
    const onUp = () => {
      if (!panDrag.current) return;
      const { photoId, didMove } = panDrag.current;
      panDrag.current = null; setDraggingId(null);
      if (!didMove) {
        const cur = selectedIdRef.current;
        if (cur === null) { selectedIdRef.current = photoId; setSelectedId(photoId); }
        else if (cur === photoId) { selectedIdRef.current = null; setSelectedId(null); }
        else { selectedIdRef.current = null; setSelectedId(null); onSwapRef.current(cur, photoId); }
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const handlePhotoMouseDown = (e: RME<HTMLDivElement>, pl: Placement) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const off = offsets.get(pl.photo.id) ?? { x: 0, y: 0 };
    const { maxPX, maxPY } = computePanInfo(pl.width, pl.height, natSizes.get(pl.photo.id), off);
    panDrag.current = { photoId: pl.photo.id, startMX: e.clientX, startMY: e.clientY, startOX: off.x, startOY: off.y, maxPX, maxPY, didMove: false };
    setDraggingId(pl.photo.id);
  };

  const handleDragEnter = (e: RDE<HTMLDivElement>) => {
    e.preventDefault(); dropCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDropping(true);
  };
  const handleDragLeave = (e: RDE<HTMLDivElement>) => {
    e.preventDefault();
    if (--dropCounter.current <= 0) { dropCounter.current = 0; setIsDropping(false); }
  };
  const handleDragOver = (e: RDE<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = (e: RDE<HTMLDivElement>) => {
    e.preventDefault(); setIsDropping(false); dropCounter.current = 0;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onPhotosAdded(files);
  };

  const { width, height } = settings;
  return (
    <div className="canvas-scroll-area">
      <div className={`collage-canvas${isDropping ? ' collage-canvas--dragging' : ''}`} style={{ width, height }}
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
        {!hasPhotos && !isDropping && (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <p className="empty-title">Drop photos here</p>
            <p className="empty-sub">JPG · PNG · GIF · WebP · or use the Add Photos button above</p>
          </div>
        )}
        {placements.map(pl => {
          const { photo, x, y, width: fw, height: fh } = pl;
          const off = offsets.get(photo.id) ?? { x: 0, y: 0 };
          const { imgW, imgH, imgLeft, imgTop, maxPX, maxPY } = computePanInfo(fw, fh, natSizes.get(photo.id), off);
          const canPan = maxPX > 0 || maxPY > 0;
          const isPanning = draggingId === photo.id;
          const isSelected = selectedId === photo.id;
          const isSwapTarget = selectedId !== null && !isSelected;
          const cursor: CSSProperties['cursor'] = isPanning ? 'grabbing' : canPan ? 'grab' : selectedId !== null ? 'pointer' : 'default';
          let cls = 'photo-box';
          if (isSelected) cls += ' photo-box--selected';
          else if (isSwapTarget) cls += ' photo-box--swap-target';
          const imgStyle: CSSProperties = { position: 'absolute', width: imgW, height: imgH, left: imgLeft, top: imgTop, display: 'block', pointerEvents: 'none' };
          return (
            <div key={photo.id} className={cls}
              style={{ left: x, top: y, width: fw, height: fh, cursor, overflow: isPanning ? 'visible' : 'hidden', zIndex: isPanning ? 15 : undefined }}
              onMouseDown={e => handlePhotoMouseDown(e, pl)}>

              {/* Ghost: full photo at 50% opacity – reveals cropped areas during pan */}
              {isPanning && canPan && (
                <img src={photo.url} alt="" aria-hidden draggable={false} style={{ ...imgStyle, opacity: 0.5 }} />
              )}

              {/* Clipped in-frame image – always full opacity */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 3, pointerEvents: 'none' }}>
                <img src={photo.url} alt={photo.name} draggable={false} style={imgStyle}
                  onLoad={e => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    setNatSizes(p => { const m = new Map(p); m.set(photo.id, { w, h }); return m; });
                  }} />
              </div>

              {/* Blue selection overlay */}
              {isSelected && <div className="photo-box__selection-overlay" />}

              {/* Pan direction hints – shown on hover, hidden while actively panning */}
              {canPan && !isPanning && (
                <>
                  {maxPX > 0 && <div className="pan-hint pan-hint--left">◀</div>}
                  {maxPX > 0 && <div className="pan-hint pan-hint--right">▶</div>}
                  {maxPY > 0 && <div className="pan-hint pan-hint--top">▲</div>}
                  {maxPY > 0 && <div className="pan-hint pan-hint--bottom">▼</div>}
                </>
              )}

              <button className="remove-btn" title={`Remove ${photo.name}`}
                onMouseDown={e => e.stopPropagation()} onClick={() => onRemovePhoto(photo.id)}>×</button>
            </div>
          );
        })}
        {isDropping && (
          <div className="drop-overlay">
            <div className="drop-overlay-inner"><span className="drop-icon">+</span><span>Drop to add photos</span></div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CollageCanvas;

import { useRef, useState, useCallback } from 'react';
import type { DragEvent } from 'react';
import type { Placement, CollageSettings } from '../types';

interface CollageCanvasProps {
  placements: Placement[];
  settings: CollageSettings;
  onPhotosAdded: (files: File[]) => void;
  onRemovePhoto: (id: string) => void;
  hasPhotos: boolean;
}

export default function CollageCanvas({
  placements,
  settings,
  onPhotosAdded,
  onRemovePhoto,
  hasPhotos,
}: CollageCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('image/'),
      );
      if (files.length > 0) {
        onPhotosAdded(files);
      }
    },
    [onPhotosAdded],
  );

  const { width, height } = settings;

  return (
    <div className="canvas-scroll-area">
      <div
        className={`collage-canvas${isDragging ? ' collage-canvas--dragging' : ''}`}
        style={{ width, height }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Empty state */}
        {!hasPhotos && !isDragging && (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <p className="empty-title">Drop photos here</p>
            <p className="empty-sub">
              JPG · PNG · GIF · WebP · or use the Add Photos button above
            </p>
          </div>
        )}

        {/* Photo boxes */}
        {placements.map(({ photo, x, y, width: w, height: h }) => (
          <div
            key={photo.id}
            className="photo-box"
            style={{ left: x, top: y, width: w, height: h }}
          >
            <img src={photo.url} alt={photo.name} draggable={false} />
            <button
              className="remove-btn"
              onClick={() => onRemovePhoto(photo.id)}
              title={`Remove ${photo.name}`}
            >
              ×
            </button>
          </div>
        ))}

        {/* Drop overlay (shown when dragging over canvas) */}
        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-overlay-inner">
              <span className="drop-icon">+</span>
              <span>Drop to add photos</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

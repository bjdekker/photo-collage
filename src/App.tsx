import { useState, useCallback, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import CollageCanvas from './components/CollageCanvas';
import type { CollageCanvasHandle } from './components/CollageCanvas';
import { generateLayout } from './utils/layoutAlgorithm';
import { exportAsJpeg, exportAsPng, exportAsSvg } from './utils/exportCollage';
import type { Photo, CollageSettings, Placement } from './types';
import './App.css';

const DEFAULT_SETTINGS: CollageSettings = {
  width: 900,
  height: 700,
  margin: 20,
  gap: 8,
};

export default function App() {
  const [photos, setPhotos]           = useState<Photo[]>([]);
  const [settings, setSettings]       = useState<CollageSettings>(DEFAULT_SETTINGS);
  const [placements, setPlacements]   = useState<Placement[]>([]);
  const [unplacedCount, setUnplacedCount] = useState(0);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const canvasRef = useRef<CollageCanvasHandle>(null);

  const applyLayout = useCallback(
    (currentPhotos: Photo[], currentSettings: CollageSettings) => {
      setLayoutRevision(r => r + 1);
      if (currentPhotos.length === 0) {
        setPlacements([]);
        setUnplacedCount(0);
        return;
      }
      const { placements: pl, unplaced } = generateLayout(
        currentPhotos,
        currentSettings.width,
        currentSettings.height,
        currentSettings.margin,
        currentSettings.gap,
      );
      setPlacements(pl);
      setUnplacedCount(unplaced.length);
    },
    [],
  );

  const handlePhotosAdded = useCallback(
    (files: File[]) => {
      const newPhotos: Photo[] = files.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setPhotos(prev => {
        const updated = [...prev, ...newPhotos];
        applyLayout(updated, settings);
        return updated;
      });
    },
    [settings, applyLayout],
  );

  const handleRegenerate = useCallback(() => {
    applyLayout(photos, settings);
  }, [photos, settings, applyLayout]);

  const handleSettingsChange = useCallback(
    (newSettings: CollageSettings) => {
      setSettings(newSettings);
      applyLayout(photos, newSettings);
    },
    [photos, applyLayout],
  );

  const handleRemovePhoto = useCallback(
    (id: string) => {
      setPhotos(prev => {
        const removed = prev.find(p => p.id === id);
        if (removed) URL.revokeObjectURL(removed.url);
        const updated = prev.filter(p => p.id !== id);
        applyLayout(updated, settings);
        return updated;
      });
    },
    [settings, applyLayout],
  );

  const handleClearAll = useCallback(() => {
    photos.forEach(p => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPlacements([]);
    setUnplacedCount(0);
    setLayoutRevision(r => r + 1);
  }, [photos]);

  const handleSwapPhotos = useCallback((id1: string, id2: string) => {
    setPlacements(prev => {
      const next = [...prev];
      const i1 = next.findIndex(p => p.photo.id === id1);
      const i2 = next.findIndex(p => p.photo.id === id2);
      if (i1 === -1 || i2 === -1) return prev;
      const p1 = next[i1].photo;
      next[i1] = { ...next[i1], photo: next[i2].photo };
      next[i2] = { ...next[i2], photo: p1 };
      return next;
    });
  }, []);

  const handleExportJpeg = useCallback(() => {
    if (!canvasRef.current || placements.length === 0) return;
    exportAsJpeg(placements, settings, canvasRef.current.getOffsets(), canvasRef.current.getNatSizes()).catch(console.error);
  }, [placements, settings]);

  const handleExportPng = useCallback(() => {
    if (!canvasRef.current || placements.length === 0) return;
    exportAsPng(placements, settings, canvasRef.current.getOffsets(), canvasRef.current.getNatSizes()).catch(console.error);
  }, [placements, settings]);

  const handleExportSvg = useCallback(() => {
    if (!canvasRef.current || placements.length === 0) return;
    exportAsSvg(placements, settings, canvasRef.current.getOffsets(), canvasRef.current.getNatSizes());
  }, [placements, settings]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Photo Collage Generator</h1>
      </header>

      <ControlPanel settings={settings} onSettingsChange={handleSettingsChange}
        onRegenerate={handleRegenerate} onClearAll={handleClearAll} onPhotosAdded={handlePhotosAdded}
        onExportJpeg={handleExportJpeg} onExportPng={handleExportPng} onExportSvg={handleExportSvg}
        hasPhotos={photos.length > 0} photoCount={photos.length} unplacedCount={unplacedCount} />

      <CollageCanvas ref={canvasRef} placements={placements} settings={settings} layoutRevision={layoutRevision} onPhotosAdded={handlePhotosAdded}
        onRemovePhoto={handleRemovePhoto} onSwapPhotos={handleSwapPhotos} hasPhotos={photos.length > 0} />
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import CollageCanvas from './components/CollageCanvas';
import type { CollageCanvasHandle } from './components/CollageCanvas';
import { generateLayout } from './utils/layoutAlgorithm';
import { exportAsJpeg, exportAsPng, exportAsSvg } from './utils/exportCollage';
import { DEFAULT_LAYOUTS, getDefaultLayoutById, applyDefaultLayout, preloadPhotoSizes } from './utils/defaultLayouts';
import type { Photo, CollageSettings, Placement, PhotoNatSize } from './types';
import './App.css';

const DEFAULT_SETTINGS: CollageSettings = { width: 900, height: 700, margin: 20, gap: 8 };
const STORAGE_KEY = 'collage-settings';
const LAYOUT_MODE_KEY = 'collage-layout-mode';
const DEFAULT_LAYOUT_KEY = 'collage-default-layout';

function loadSettings(): CollageSettings {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) try { return JSON.parse(stored); } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: CollageSettings) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function loadLayoutMode(): 'generated' | 'default' {
  const stored = localStorage.getItem(LAYOUT_MODE_KEY);
  if (stored === 'default' || stored === 'generated') return stored;
  return 'generated';
}

function saveLayoutMode(mode: 'generated' | 'default') { localStorage.setItem(LAYOUT_MODE_KEY, mode); }

function loadDefaultLayout(): string {
  const stored = localStorage.getItem(DEFAULT_LAYOUT_KEY);
  if (stored && DEFAULT_LAYOUTS.some(l => l.id === stored)) return stored;
  return DEFAULT_LAYOUTS[0]?.id ?? '';
}

function saveDefaultLayout(id: string) { localStorage.setItem(DEFAULT_LAYOUT_KEY, id); }

function getDisplayScale(width: number, height: number): number {
  const maxW = Math.max(600, window.innerWidth - 64);
  const maxH = Math.max(400, window.innerHeight - 300);
  return Math.min(maxW / width, maxH / height, 1);
}

export default function App() {
  const [settings, setSettings]                 = useState<CollageSettings>(loadSettings());
  const [layoutMode, setLayoutMode]             = useState<'generated' | 'default'>(loadLayoutMode());
  const [selectedDefaultLayout, setSelectedDefaultLayout] = useState<string>(loadDefaultLayout());
  const [displayScale, setDisplayScale]         = useState<number>(() => {
    const mode = loadLayoutMode();
    if (mode === 'default') {
      const layout = getDefaultLayoutById(loadDefaultLayout());
      if (layout) return getDisplayScale(layout.width, layout.height);
    }
    const s = loadSettings();
    return getDisplayScale(s.width, s.height);
  });
  const [photos, setPhotos]                     = useState<Photo[]>([]);
  const [placements, setPlacements]             = useState<Placement[]>([]);
  const [unplacedCount, setUnplacedCount]       = useState(0);
  const [layoutRevision, setLayoutRevision]     = useState(0);
  const [natSizes, setNatSizes]                 = useState<Map<string, PhotoNatSize>>(new Map());
  const canvasRef = useRef<CollageCanvasHandle>(null);

  // Refs so applyLayout always reads the current mode/layoutId without stale closures
  const layoutModeRef = useRef(layoutMode);
  const selectedDefaultLayoutRef = useRef(selectedDefaultLayout);

  // Update display scale when window resizes
  useEffect(() => {
    const handleResize = () => {
      const newScale = getDisplayScale(
        layoutMode === 'default' ? getDefaultLayoutById(selectedDefaultLayout)?.width ?? settings.width : settings.width,
        layoutMode === 'default' ? getDefaultLayoutById(selectedDefaultLayout)?.height ?? settings.height : settings.height
      );
      setDisplayScale(newScale);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutMode, selectedDefaultLayout, settings]);

  const applyLayout = useCallback(
    (currentPhotos: Photo[], currentSettings: CollageSettings, currentNatSizes?: Map<string, PhotoNatSize>) => {
      setLayoutRevision(r => r + 1);

      // Always read mode/layoutId from refs so the call sees the value set in the same event handler
      const mode = layoutModeRef.current;
      const layoutId = selectedDefaultLayoutRef.current;

      if (mode === 'default') {
        const layout = getDefaultLayoutById(layoutId);
        if (layout) {
          setDisplayScale(getDisplayScale(layout.width, layout.height));
          if (currentPhotos.length === 0) { setPlacements([]); setUnplacedCount(0); return; }
          const pl = applyDefaultLayout(currentPhotos, layout, currentNatSizes ?? natSizes);
          setPlacements(pl);
          setUnplacedCount(currentPhotos.length - pl.length);
        }
      } else {
        setDisplayScale(getDisplayScale(currentSettings.width, currentSettings.height));
        if (currentPhotos.length === 0) { setPlacements([]); setUnplacedCount(0); return; }
        const { placements: pl, unplaced } = generateLayout(
          currentPhotos,
          currentSettings.width, currentSettings.height,
          currentSettings.margin, currentSettings.gap,
        );
        setPlacements(pl);
        setUnplacedCount(unplaced.length);
      }
    },
    [natSizes],
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
        
        // If in default layout mode, preload image sizes before applying layout
        if (layoutMode === 'default') {
          preloadPhotoSizes(updated).then(sizes => {
            setNatSizes(sizes);
            applyLayout(updated, settings, sizes);
          });
        } else {
          applyLayout(updated, settings);
        }
        
        return updated;
      });
    },
    [settings, layoutMode, applyLayout],
  );

  const handleRegenerate = useCallback(() => {
    applyLayout(photos, settings);
  }, [photos, settings, applyLayout]);

  const handleLayoutModeChange = useCallback((mode: 'generated' | 'default') => {
    layoutModeRef.current = mode; // update ref BEFORE applyLayout reads it
    setLayoutMode(mode);
    saveLayoutMode(mode);
    if (mode === 'default' && photos.length > 0) {
      preloadPhotoSizes(photos).then(sizes => {
        setNatSizes(sizes);
        applyLayout(photos, settings, sizes);
      });
    } else {
      applyLayout(photos, settings);
    }
  }, [photos, settings, applyLayout]);

  const handleDefaultLayoutChange = useCallback((layoutId: string) => {
    selectedDefaultLayoutRef.current = layoutId; // update ref BEFORE applyLayout reads it
    setSelectedDefaultLayout(layoutId);
    saveDefaultLayout(layoutId);
    if (photos.length > 0) {
      preloadPhotoSizes(photos).then(sizes => {
        setNatSizes(sizes);
        applyLayout(photos, settings, sizes);
      });
    } else {
      applyLayout(photos, settings);
    }
  }, [photos, settings, applyLayout]);

  const handleSettingsChange = useCallback(
    (newSettings: CollageSettings) => {
      // Validate: reject width/height if 0 or > 5000, allow margin/gap = 0
      let validSettings = { ...newSettings };
      if (validSettings.width < 1 || validSettings.width > 5000) validSettings.width = settings.width;
      if (validSettings.height < 1 || validSettings.height > 5000) validSettings.height = settings.height;
      if (validSettings.margin < 0) validSettings.margin = settings.margin;
      if (validSettings.gap < 0) validSettings.gap = settings.gap;
      setSettings(validSettings);
      saveSettings(validSettings);
      applyLayout(photos, validSettings);
    },
    [photos, settings, applyLayout],
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
    const currentSettings = layoutMode === 'default'
      ? { ...(getDefaultLayoutById(selectedDefaultLayout) ?? DEFAULT_SETTINGS), margin: 0, gap: 0 } as CollageSettings
      : settings;
    exportAsJpeg(placements, currentSettings, canvasRef.current.getOffsets(), canvasRef.current.getNatSizes()).catch(console.error);
  }, [placements, settings, layoutMode, selectedDefaultLayout]);

  const handleExportPng = useCallback(() => {
    if (!canvasRef.current || placements.length === 0) return;
    const currentSettings = layoutMode === 'default'
      ? { ...(getDefaultLayoutById(selectedDefaultLayout) ?? DEFAULT_SETTINGS), margin: 0, gap: 0 } as CollageSettings
      : settings;
    exportAsPng(placements, currentSettings, canvasRef.current.getOffsets(), canvasRef.current.getNatSizes()).catch(console.error);
  }, [placements, settings, layoutMode, selectedDefaultLayout]);

  const handleExportSvg = useCallback(() => {
    if (!canvasRef.current || placements.length === 0) return;
    const currentSettings = layoutMode === 'default'
      ? { ...(getDefaultLayoutById(selectedDefaultLayout) ?? DEFAULT_SETTINGS), margin: 0, gap: 0 } as CollageSettings
      : settings;
    exportAsSvg(placements, currentSettings, canvasRef.current.getOffsets(), canvasRef.current.getNatSizes());
  }, [placements, settings, layoutMode, selectedDefaultLayout]);

  // Update natSizes when images load in canvas (for generated layouts)
  // In default layout mode, natSizes are preloaded in callbacks
  useEffect(() => {
    if (canvasRef.current && layoutMode === 'generated') {
      const sizes = canvasRef.current.getNatSizes();
      setNatSizes(sizes);
    }
  }, [layoutMode, layoutRevision]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Photo Collage Generator</h1>
      </header>

      <ControlPanel
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onRegenerate={handleRegenerate}
        onClearAll={handleClearAll}
        onPhotosAdded={handlePhotosAdded}
        onExportJpeg={handleExportJpeg}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        hasPhotos={photos.length > 0}
        photoCount={photos.length}
        unplacedCount={unplacedCount}
        layoutMode={layoutMode}
        onLayoutModeChange={handleLayoutModeChange}
        defaultLayouts={DEFAULT_LAYOUTS}
        selectedDefaultLayout={selectedDefaultLayout}
        onDefaultLayoutChange={handleDefaultLayoutChange}
      />

      <CollageCanvas
        ref={canvasRef}
        placements={placements}
        settings={layoutMode === 'default' ? { ...(getDefaultLayoutById(selectedDefaultLayout) ?? DEFAULT_SETTINGS), margin: 0, gap: 0 } as CollageSettings : settings}
        displayScale={displayScale}
        layoutRevision={layoutRevision}
        onPhotosAdded={handlePhotosAdded}
        onRemovePhoto={handleRemovePhoto}
        onSwapPhotos={handleSwapPhotos}
        hasPhotos={photos.length > 0}
        presetFrames={layoutMode === 'default' ? getDefaultLayoutById(selectedDefaultLayout)?.frames : undefined}
      />
    </div>
  );
}

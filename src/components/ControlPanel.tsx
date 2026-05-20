import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { CollageSettings } from '../types';

interface ControlPanelProps {
  settings: CollageSettings;
  onSettingsChange: (settings: CollageSettings) => void;
  onRegenerate: () => void;
  onClearAll: () => void;
  onPhotosAdded: (files: File[]) => void;
  onExportJpeg: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  hasPhotos: boolean;
  photoCount: number;
  unplacedCount: number;
}

export default function ControlPanel({
  settings, onSettingsChange, onRegenerate, onClearAll, onPhotosAdded,
  onExportJpeg, onExportPng, onExportSvg,
  hasPhotos, photoCount, unplacedCount,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNumberChange =
    (field: keyof CollageSettings) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10) || 0;
      onSettingsChange({ ...settings, [field]: value });
    };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f =>
      f.type.startsWith('image/'),
    );
    if (files.length > 0) onPhotosAdded(files);
    // Reset so same files can be re-added after clearing
    e.target.value = '';
  };

  return (
    <div className="control-panel">
      <div className="control-fields">
        <label className="field-label">
          <span>Width (px)</span>
          <input type="number" className="field-input" value={settings.width}
            onChange={handleNumberChange('width')} />
        </label>

        <label className="field-label">
          <span>Height (px)</span>
          <input type="number" className="field-input" value={settings.height}
            onChange={handleNumberChange('height')} />
        </label>

        <label className="field-label">
          <span>Margin (px)</span>
          <input type="number" className="field-input" value={settings.margin}
            onChange={handleNumberChange('margin')} />
        </label>

        <label className="field-label">
          <span>Gap (px)</span>
          <input type="number" className="field-input" value={settings.gap}
            onChange={handleNumberChange('gap')} />
        </label>
      </div>

      <div className="control-actions">
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Add Photos</button>

        <button className="btn btn-secondary" onClick={onRegenerate} disabled={!hasPhotos}
          title="Generate a new random arrangement">↻ Regenerate</button>

        <button className="btn btn-danger" onClick={onClearAll} disabled={!hasPhotos}>Clear All</button>

        <div className="export-group">
          <span className="export-label">Export</span>
          <button className="btn btn-export" onClick={onExportJpeg} disabled={!hasPhotos} title="Download as JPEG (lossless quality)">JPG</button>
          <button className="btn btn-export" onClick={onExportPng}  disabled={!hasPhotos} title="Download as PNG">PNG</button>
          <button className="btn btn-export" onClick={onExportSvg}  disabled={!hasPhotos} title="Download as Inkscape SVG (images must be in the same folder)">SVG</button>
        </div>

        <span className="photo-count">
          {photoCount} photo{photoCount !== 1 ? 's' : ''}
          {unplacedCount > 0 && (
            <span className="unplaced-warning" title="Increase canvas size or reduce photo count">
              {' '}· {unplacedCount} didn't fit
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

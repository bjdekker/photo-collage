import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { CollageSettings } from '../types';

interface ControlPanelProps {
  settings: CollageSettings;
  onSettingsChange: (settings: CollageSettings) => void;
  onRegenerate: () => void;
  onClearAll: () => void;
  onPhotosAdded: (files: File[]) => void;
  hasPhotos: boolean;
  photoCount: number;
  unplacedCount: number;
}

export default function ControlPanel({
  settings,
  onSettingsChange,
  onRegenerate,
  onClearAll,
  onPhotosAdded,
  hasPhotos,
  photoCount,
  unplacedCount,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNumberChange =
    (field: keyof CollageSettings, min: number, max: number) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= min && value <= max) {
        onSettingsChange({ ...settings, [field]: value });
      }
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
            onChange={handleNumberChange('width', 100, 5000)} min="100" max="5000" step="10" />
        </label>

        <label className="field-label">
          <span>Height (px)</span>
          <input type="number" className="field-input" value={settings.height}
            onChange={handleNumberChange('height', 100, 5000)} min="100" max="5000" step="10" />
        </label>

        <label className="field-label">
          <span>Margin (px)</span>
          <input type="number" className="field-input" value={settings.margin}
            onChange={handleNumberChange('margin', 0, 200)} min="0" max="200" />
        </label>

        <label className="field-label">
          <span>Gap (px)</span>
          <input type="number" className="field-input" value={settings.gap}
            onChange={handleNumberChange('gap', 0, 100)} min="0" max="100" />
        </label>
      </div>

      <div className="control-actions">
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Add Photos</button>

        <button className="btn btn-secondary" onClick={onRegenerate} disabled={!hasPhotos}
          title="Generate a new random arrangement">↻ Regenerate</button>

        <button className="btn btn-danger" onClick={onClearAll} disabled={!hasPhotos}>Clear All</button>

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

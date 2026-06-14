import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChangeEvent } from 'react';
import type { CollageSettings, DefaultLayout } from '../types';

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
  layoutMode: 'generated' | 'default';
  onLayoutModeChange: (mode: 'generated' | 'default') => void;
  defaultLayouts: DefaultLayout[];
  selectedDefaultLayout: string;
  onDefaultLayoutChange: (layoutId: string) => void;
}

export default function ControlPanel({
  settings, onSettingsChange, onRegenerate, onClearAll, onPhotosAdded,
  onExportJpeg, onExportPng, onExportSvg,
  hasPhotos, photoCount, unplacedCount,
  layoutMode, onLayoutModeChange, defaultLayouts, selectedDefaultLayout, onDefaultLayoutChange,
}: ControlPanelProps) {
  const { t } = useTranslation();
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

  const isDefaultMode = layoutMode === 'default';

  return (
    <div className="control-panel">
      {/* Layout mode selector */}
      <div className="layout-mode-selector">
        <label className="mode-label">{t('layoutMode')}</label>
        <button
          className={`mode-btn ${layoutMode === 'generated' ? 'mode-btn--active' : ''}`}
          onClick={() => onLayoutModeChange('generated')}
        >
          {t('generated')}
        </button>
        <button
          className={`mode-btn ${layoutMode === 'default' ? 'mode-btn--active' : ''}`}
          onClick={() => onLayoutModeChange('default')}
        >
          {t('presets')}
        </button>
      </div>

      {/* Default layout selector - only shown in default mode */}
      {isDefaultMode && (
        <div className="default-layout-selector">
          <label className="field-label">
            <span>{t('layout')}</span>
            <select
              className="field-input"
              value={selectedDefaultLayout}
              onChange={(e) => onDefaultLayoutChange(e.target.value)}
            >
              {defaultLayouts.map(layout => (
                <option key={layout.id} value={layout.id}>
                  {t(`layouts.${layout.name}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Canvas settings - only shown in generated mode */}
      {!isDefaultMode && (
        <div className="control-fields">
          <label className="field-label">
            <span>{t('width')}</span>
            <input type="number" className="field-input" value={settings.width}
              onChange={handleNumberChange('width')} />
          </label>

          <label className="field-label">
            <span>{t('height')}</span>
            <input type="number" className="field-input" value={settings.height}
              onChange={handleNumberChange('height')} />
          </label>

          <label className="field-label">
            <span>{t('margin')}</span>
            <input type="number" className="field-input" value={settings.margin}
              onChange={handleNumberChange('margin')} />
          </label>

          <label className="field-label">
            <span>{t('gap')}</span>
            <input type="number" className="field-input" value={settings.gap}
              onChange={handleNumberChange('gap')} />
          </label>
        </div>
      )}

      <div className="control-actions">
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>{t('addPhotos')}</button>

        <button className="btn btn-secondary" onClick={onRegenerate} disabled={!hasPhotos || isDefaultMode}
          title={isDefaultMode ? t('regenerateDisabledTooltip') : t('regenerateTooltip')}>{t('regenerate')}</button>

        <button className="btn btn-danger" onClick={onClearAll} disabled={!hasPhotos}>{t('clearAll')}</button>

        <div className="export-group">
          <span className="export-label">{t('export')}</span>
          <button className="btn btn-export" onClick={onExportJpeg} disabled={!hasPhotos} title={t('exportJpgTooltip')}>{t('exportJpg')}</button>
          <button className="btn btn-export" onClick={onExportPng}  disabled={!hasPhotos} title={t('exportPngTooltip')}>{t('exportPng')}</button>
          <button className="btn btn-export" onClick={onExportSvg}  disabled={!hasPhotos} title={t('exportSvgTooltip')}>{t('exportSvg')}</button>
        </div>

        <span className="photo-count">
          {t('photo', { count: photoCount })}
          {unplacedCount > 0 && (
            <span className="unplaced-warning" title={t('spacingWarning')}>
              {' '}· {unplacedCount} {t('didntFit')}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

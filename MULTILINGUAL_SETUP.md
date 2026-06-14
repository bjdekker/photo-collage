# Multilingual Support Implementation

## Overview
The collage application now supports multiple languages with automatic browser language detection.

## Supported Languages
- **English** (en) - Default language
- **Dutch** (nl) - Added with this implementation

## How It Works

### Browser Language Detection
The application automatically detects the user's browser language preference:
- If browser language is Dutch (nl), interface displays in Dutch
- Otherwise, interface defaults to English
- Users can potentially extend this to add more languages

### Initialization
1. **i18n.ts** - Main i18n configuration file that:
   - Imports translation files from `src/locales/`
   - Detects browser language using `navigator.language`
   - Initializes i18next with React integration
   - Sets English as fallback language

2. **main.tsx** - Updated to:
   - Import i18n configuration
   - Wrap the App with `I18nextProvider`

### Translation Files Location
- `src/locales/en.json` - English translations
- `src/locales/nl.json` - Dutch translations

### Translated Components
- **ControlPanel.tsx** - All UI labels, buttons, tooltips, and messages
- **defaultLayouts.ts** - Layout preset names (Insta Strip, Square)

### Translated Strings
All user-facing text has been translated:
- Layout mode labels and buttons
- Canvas settings fields (Width, Height, Margin, Gap)
- Action buttons (Add Photos, Regenerate, Clear All, Export)
- Export format options (JPG, PNG, SVG) with tooltips
- Photo count display with proper pluralization
- Responsive messages (unplaced photo warnings)
- Layout preset names

## Key Features

### Pluralization
Dutch and English have different plural rules handled automatically:
- English: "1 photo" vs. "5 photos"
- Dutch: "1 foto" vs. "5 foto's"

### Easy to Extend
To add more languages:
1. Create a new translation file: `src/locales/{languageCode}.json`
2. Import it in `src/i18n.ts`
3. Add it to the `resources` object in i18n config
4. Update `getBrowserLanguage()` if needed

## Technical Stack
- **i18next** - Internationalization framework
- **react-i18next** - React bindings for i18next
- **JSON-based translations** - Simple, maintainable translation files

## Dependencies Added
```json
{
  "dependencies": {
    "i18next": "^latest",
    "react-i18next": "^latest"
  }
}
```

## Testing
To test the multilingual support:
1. Change your browser language preference to Dutch (nl)
2. Reload the application
3. Interface should display in Dutch
4. Switch back to English for default behavior

## Files Modified/Created
- ✅ Created: `src/i18n.ts` - i18n configuration
- ✅ Created: `src/locales/en.json` - English translations
- ✅ Created: `src/locales/nl.json` - Dutch translations (NEW)
- ✅ Modified: `src/main.tsx` - Added I18nextProvider
- ✅ Modified: `src/components/ControlPanel.tsx` - Integrated translations
- ✅ Modified: `src/utils/defaultLayouts.ts` - Updated layout names to use translation keys
- ✅ Updated: `package.json` - Added dependencies

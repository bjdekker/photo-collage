import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import nl from './locales/nl.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0];
  // Support 'nl' for Dutch, default to 'en' for English
  return browserLang === 'nl' ? 'nl' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      nl: { translation: nl },
    },
    lng: getBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

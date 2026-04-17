import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, getTranslation } from './i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['it']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('it');

  useEffect(() => {
    const savedLang = localStorage.getItem('partypal_lang') as Language;
    if (savedLang && ['it', 'en', 'ro', 'fr'].includes(savedLang)) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('partypal_lang', lang);
  };

  const t = (key: keyof typeof translations['it']) => getTranslation(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

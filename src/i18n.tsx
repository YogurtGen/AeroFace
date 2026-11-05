import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import indonesian from './translations.json';
export type Language = 'en' | 'id';
const dictionary: Record<string,string> = indonesian;
const english = Object.fromEntries(Object.entries(dictionary).map(([en,id])=>[id,en]));
const lowerId = Object.fromEntries(Object.entries(dictionary).map(([en,id])=>[en.toLowerCase(),id.toLowerCase()]));
export function translate(text: string, language: Language): string {
  if (language === 'en') return english[text] ?? text;
  if (dictionary[text]) return dictionary[text];
  if (text.startsWith('Complete the landmark: ')) return `Lengkapi titik: ${lowerId[text.slice(23).replace(/\.$/,'')] ?? text.slice(23)}.`;
  return text
    .replace(/% deviation/g,'% selisih').replace(/% pair deviation/g,'% selisih pasangan')
    .replace(/× eye width/g,'× lebar mata').replace(/× cheek width/g,'× lebar pipi')
    .replace(/% lower section/g,'% bagian bawah').replace(/% profile height/g,'% tinggi profil')
    .replace(/× jaw segment/g,'× segmen rahang').replace(/× face width/g,'× lebar wajah')
    .replace(/(\d)\.(\d+)(?=\s*[×%°])/g,'$1,$2');
}
type Locale = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string };
const Context = createContext<Locale>({language:'en',setLanguage:()=>{},t:text=>text});
export function I18nProvider({children}: {children:ReactNode}) {
  const [language,setLanguageState] = useState<Language>(()=>new URLSearchParams(location.hash.slice(1)).get('lang')==='id'?'id':'en');
  const setLanguage = (next:Language) => {setLanguageState(next);history.replaceState(null,'',`${location.pathname}${location.search}#lang=${next}`);};
  useEffect(()=>{document.documentElement.lang=language;document.title=language==='en'?'AeroFace — Know your angles':'AeroFace — Kenali proporsimu';},[language]);
  return <Context.Provider value={{language,setLanguage,t:text=>translate(text,language)}}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);

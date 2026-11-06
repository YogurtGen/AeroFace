import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist/latin-600.css';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';
import './readability.css';
import './flow.css';
import './motion.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><I18nProvider><App /></I18nProvider></React.StrictMode>);

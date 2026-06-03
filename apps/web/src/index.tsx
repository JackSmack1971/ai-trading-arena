import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app mount target.');
createRoot(app).render(<App />);

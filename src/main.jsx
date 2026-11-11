import './style.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';

if (!globalThis.miniApp) {
  document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
}
createRoot(document.getElementById('root')).render(<App />);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TabletWorkspace } from './TabletWorkspace';
import { OpeningFilm } from './OpeningFilm';
import './theme.css';
import './console-hud.css';
import './persistent-console-shell.css';
import './projection/theme.css';
import './projection/cinematics.css';
import './projection/shell.css';
import '../../../web-theme.mjs';
import './web-gold.css';

createRoot(document.getElementById('root')!).render(<StrictMode><OpeningFilm><TabletWorkspace /></OpeningFilm></StrictMode>);

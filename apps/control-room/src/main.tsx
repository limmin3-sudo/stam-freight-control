import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpaceExperience } from './SpaceExperience';
import './theme.css';
import './console-hud.css';
import './persistent-console-shell.css';

// The retired lounge-preparation film must not wrap the division or existing routes.
createRoot(document.getElementById('root')!).render(<StrictMode><SpaceExperience /></StrictMode>);

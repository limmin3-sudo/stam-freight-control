import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpaceExperience } from './SpaceExperience';
import './theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><SpaceExperience /></StrictMode>);

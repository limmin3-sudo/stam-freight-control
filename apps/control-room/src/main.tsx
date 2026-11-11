import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpaceExperience } from './SpaceExperience';
import { OpeningFilm } from './OpeningFilm';
import './theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><OpeningFilm><SpaceExperience /></OpeningFilm></StrictMode>);

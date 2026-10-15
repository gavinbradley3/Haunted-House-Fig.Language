import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/literata/400.css';
import '@fontsource/literata/600.css';
import '@fontsource/literata/400-italic.css';
import './index.css';
import App from './App';
import { useGame } from './state/store';
import * as nav from './lesson/navigation';
import * as director from './lesson/director';
import { skipCinematic } from './scene/Player';
import { liveCamera, world } from './systems/time';
import { getInteractable } from './systems/interaction';
import { triggerStrangeEvent } from './scene/HouseEvents';
import { hungPaintings } from './scene/parts/Artwork';
import { houseState } from './scene/parts/Lights';
import { renderer } from './systems/renderer';
import { audio } from './systems/audio';
import { mats } from './systems/materials';

// Test hook used by the automated browser checks (scripts/shots.mjs).
(window as unknown as Record<string, unknown>).__hosl = { useGame, nav, director, skipCinematic, liveCamera, getInteractable, triggerStrangeEvent, hungPaintings, audio, houseState, world, mats,
  programs: () => renderer.gl?.info.programs?.length ?? -1 };

// Canvas textures (clock face, plaques, mirror text) use the display font, so wait for it.
const fontsReady = Promise.all([
  document.fonts.load('600 40px "Cormorant Garamond"'),
  document.fonts.load('italic 500 40px "Cormorant Garamond"'),
]).catch(() => undefined);

void Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

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
import { TEST_BUILD } from './systems/testBuild';
import { prewarmTextures } from './systems/materials';
import { initialQuality, probeGpuName } from './systems/gpuTier';
import { hasSavedQuality, useGame } from './state/store';

// First run on this computer: start at the graphics quality it can manage (decided before the
// 3D view is created, because changing it later rebuilds the renderer).
if (!hasSavedQuality()) useGame.getState().setQuality(initialQuality(probeGpuName()), true);

// Test hook for the automated browser checks: dev and test builds only, never the classroom build.
if (TEST_BUILD) void import('./testHook').then((t) => t.installTestHook());

// Canvas textures (clock face, plaques, mirror text) use the display font, so wait for it.
const fontsReady = Promise.all([
  document.fonts.load('600 40px "Cormorant Garamond"'),
  document.fonts.load('italic 500 40px "Cormorant Garamond"'),
]).catch(() => undefined);

// Make the house's textures before the game starts, one at a time, so the page never freezes and
// the loading screen can show progress (this takes several seconds on school computers).
const boot = document.getElementById('boot');
void Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))])
  .then(() =>
    prewarmTextures((done, total) => {
      if (boot) boot.textContent = `The house is waking… ${Math.round((done / total) * 100)}%`;
    }),
  )
  .then(() => {
    if (boot) boot.textContent = 'The house is waking…';
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

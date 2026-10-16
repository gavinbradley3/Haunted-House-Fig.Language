import { useEffect } from 'react';
import { GameCanvas } from './scene/GameCanvas';
import { skipCinematic } from './scene/Player';
import { useGame } from './state/store';
import { audio } from './systems/audio';
import { LessonPanel } from './ui/LessonPanel';
import { HelpOverlay, HUD, TitleScreen } from './ui/Overlays';
import { TeacherPanel } from './ui/TeacherPanel';
import { KeyRing, PaintingCard } from './ui/PaintingCard';
import { MothSwarm } from './ui/MothSwarm';
import { Ending } from './ui/Ending';
import { SoundCaption } from './ui/SoundCaption';
import { toggleFullscreen } from './ui/fullscreen';

function isTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

/** Global keyboard shortcuts and settings → audio wiring. */
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const s = useGame.getState();
      switch (e.code) {
        case 'KeyT':
          s.setTeacherOpen(!s.teacherOpen);
          if (document.pointerLockElement) document.exitPointerLock();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyM':
          audio.unlock();
          s.toggleMute();
          break;
        case 'KeyP':
          if (s.phase === 'play') s.setPaused(!s.paused);
          break;
        case 'Space':
        case 'Enter':
          if (s.cinematic) {
            e.preventDefault();
            skipCinematic();
          }
          break;
        case 'Escape':
          if (s.teacherOpen) s.setTeacherOpen(false);
          else if (s.inspecting) s.setInspecting(null);
          else if (s.helpOpen) s.setHelpOpen(false);
          else if (s.phase === 'play' && !s.lessonActive && !document.pointerLockElement) s.setHelpOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const apply = () => {
      const s = useGame.getState();
      audio.setVolume(s.volume, s.muted);
      audio.setMusicOn(s.musicOn);
    };
    apply();
    return useGame.subscribe((s, p) => {
      if (s.volume !== p.volume || s.muted !== p.muted) apply();
      if (s.paused !== p.paused) audio.suspend(s.paused);
      audio.footstepsOn = s.footstepsOn;
      if (s.musicOn !== p.musicOn) audio.setMusicOn(s.musicOn);
      if (s.lessonActive !== p.lessonActive) audio.setLessonActive(s.lessonActive);
    });
  }, []);
}

export default function App() {
  useShortcuts();
  const lessonActive = useGame((s) => s.lessonActive && !s.endingOpen);
  return (
    <>
      <GameCanvas />
      <MothSwarm />
      <TitleScreen />
      <HUD />
      {lessonActive && <LessonPanel />}
      <PaintingCard />
      <KeyRing />
      <SoundCaption />
      <Ending />
      <TeacherPanel />
      <HelpOverlay />
    </>
  );
}

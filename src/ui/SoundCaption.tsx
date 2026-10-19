/**
 * On-screen captions: a text alternative for anyone who cannot hear the sounds.
 *  - Lesson sounds are always captioned. During a lesson they sit over the scene, beside the panel.
 *  - The house's own noises (creaks, knocks, steps elsewhere) are captioned according to the
 *    student's setting: when their sound is off (the default), always, or never.
 */
import { useEffect, useState } from 'react';
import { panelSide } from '../lesson/director';
import { game, useGame } from '../state/store';
import { onCaption, onHouseCaption } from '../systems/soundCues';

export function SoundCaption() {
  const lessonActive = useGame((s) => s.lessonActive);
  const shot = useGame((s) => s.shot);
  const [caption, setCaption] = useState<{ text: string; n: number } | null>(null);
  const [house, setHouse] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => onCaption((text) => setCaption((c) => ({ text, n: (c?.n ?? 0) + 1 }))), []);
  useEffect(
    () =>
      onHouseCaption((text) => {
        const s = game();
        const show = s.houseCaptions === 'on' || (s.houseCaptions === 'auto' && (s.muted || s.volume < 0.05));
        if (show) setHouse((c) => ({ text, n: (c?.n ?? 0) + 1 }));
      }),
    [],
  );
  useEffect(() => {
    if (!caption) return;
    const id = window.setTimeout(() => setCaption(null), 4500);
    return () => clearTimeout(id);
  }, [caption]);
  useEffect(() => {
    if (!house) return;
    const id = window.setTimeout(() => setHouse(null), 4000);
    return () => clearTimeout(id);
  }, [house]);
  return (
    <>
      {caption && (
        <div className={`sound-caption ${lessonActive ? `beside-${panelSide(shot)}` : ''}`} key={caption.n} role="status" aria-live="polite">
          <span aria-hidden="true">♪</span> {caption.text}
        </div>
      )}
      {house && !lessonActive && (
        <div className="house-caption" key={`h${house.n}`} role="status" aria-live="polite">
          [{house.text}]
        </div>
      )}
    </>
  );
}

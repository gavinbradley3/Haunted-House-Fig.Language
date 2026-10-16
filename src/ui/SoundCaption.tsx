/**
 * On-screen captions for the house's lesson sounds: a text alternative for anyone who cannot hear them.
 * During a lesson they sit over the scene, beside the panel, so they never cover it.
 */
import { useEffect, useState } from 'react';
import { panelSide } from '../lesson/director';
import { useGame } from '../state/store';
import { onCaption } from '../systems/soundCues';

export function SoundCaption() {
  const lessonActive = useGame((s) => s.lessonActive);
  const shot = useGame((s) => s.shot);
  const [caption, setCaption] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => onCaption((text) => setCaption((c) => ({ text, n: (c?.n ?? 0) + 1 }))), []);
  useEffect(() => {
    if (!caption) return;
    const id = window.setTimeout(() => setCaption(null), 4500);
    return () => clearTimeout(id);
  }, [caption]);
  if (!caption) return null;
  return (
    <div className={`sound-caption ${lessonActive ? `beside-${panelSide(shot)}` : ""}`} key={caption.n} role="status" aria-live="polite">
      <span aria-hidden="true">♪</span> {caption.text}
    </div>
  );
}

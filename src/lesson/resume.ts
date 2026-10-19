/**
 * Carrying on a saved game: put the student back where they were standing, in a room their keys
 * allow, with that room's door open behind them, and reopen the lesson they had open. Anything that
 * does not check out (an old or impossible position) puts them in the entrance hall instead.
 */
import { openLesson } from './director';
import { safePlace } from './place';
import { nextStep } from './guide';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';

/** "Continue" on the title screen. */
export function resumeGame() {
  const s = useGame.getState();
  audio.unlock();
  const where = safePlace(s.savedPlace, s.progress);
  s.setDoor('front', true);
  if (where.door) s.setDoor(where.door, true);
  s.teleportTo(where.pose);
  s.setZone(where.zone);
  audio.setZone(where.zone);
  s.setPhase('play');
  const lesson = s.savedPlace?.lesson ?? null;
  // Reopen the lesson that was open, if the student is back in its room.
  const lessonHere = lesson && where.restored && (lesson === 'finale' ? where.zone === 'hall' && s.progress.unlocked.desk : true);
  if (lessonHere) {
    window.setTimeout(() => {
      if (game().phase === 'play' && !game().lessonActive) openLesson(lesson);
    }, 700);
    return;
  }
  const step = nextStep(s.progress, s.lessons);
  s.showNotice(where.restored ? 'Welcome back.' : 'Welcome back to the entrance hall.', `Next: ${step.text}`);
}

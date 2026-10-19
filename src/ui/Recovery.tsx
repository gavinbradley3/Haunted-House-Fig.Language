/**
 * What a student sees when something goes wrong, instead of a frozen or blank screen. Each card says
 * what happened in plain words, that their progress is safe, and gives one button to fix it.
 */
import { Component, type ReactNode } from 'react';
import { persistNow, useGame } from '../state/store';

function Card({ title, children, action, onAction }: { title: string; children: ReactNode; action: string; onAction: () => void }) {
  return (
    <div className="recovery" role="alertdialog" aria-label={title}>
      <div className="recovery-card">
        <h2>{title}</h2>
        {children}
        <button className="btn primary" onClick={onAction} autoFocus>
          {action}
        </button>
      </div>
    </div>
  );
}

/** Save what we can, then reload the page (the saved game carries on). */
function reload() {
  try {
    persistNow();
  } catch {
    /* nothing more can be saved */
  }
  location.reload();
}

/** The graphics stopped (low memory, the lid shut, a graphics reset) or the game is open twice. */
export function RecoveryCards() {
  const lost = useGame((s) => s.graphicsLost);
  const conflict = useGame((s) => s.saveStatus === 'conflict');
  if (lost)
    return (
      <Card title="The house needs a moment" action="Reload the house" onAction={reload}>
        <p>The Chromebook’s graphics stopped working. This can happen when lots of tabs are open or the Chromebook has been asleep.</p>
        <p>Your progress is saved. Close any other tabs you do not need, then reload.</p>
      </Card>
    );
  if (conflict)
    return (
      <Card title="The house is open in another tab" action="Carry on in this tab instead" onAction={() => location.reload()}>
        <p>You opened the game twice. To keep your progress safe, it is only saved in the tab you used most recently.</p>
        <p>Close this tab and go back to the other one, or carry on here (this tab will pick up your latest progress).</p>
      </Card>
    );
  return null;
}

/** If anything in the game crashes, show a way back instead of a blank screen. */
export class CrashGuard extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[crash]', error);
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <Card title="Something went wrong in the house" action="Reload the house" onAction={() => location.reload()}>
        <p>Your progress up to this moment is saved on this Chromebook. Reload to carry on.</p>
        <p>If this keeps happening, tell your teacher which room you were in.</p>
      </Card>
    );
  }
}

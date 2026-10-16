/**
 * A door that stays locked until the right key is turned in it, then opens like any
 * other door for good. From the inside the lock always turns, so nobody is shut in.
 */
import { useRef } from 'react';
import { doorState, KEY_NAMES, LOCK_KEY, type LockId } from '../../lesson/progression';
import { game, useGame, type DoorId } from '../../state/store';
import { audio } from '../../systems/audio';
import type { Zone } from '../../world/layout';
import { Door } from './Door';

interface Props {
  id: string;
  door: DoorId;
  lock: 'gallery' | LockId;
  /** The room behind the door, as the plaque and messages name it. */
  room: string;
  /** The zone on the far side: standing there, the door always opens. */
  inside: Zone;
  hinge: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
  /** Second line of the message when the door is tried without its key. */
  lockedHint: () => string;
}

export function KeyedDoor({ id, door, lock, room, inside, hinge, rotationY, width, height, lockedHint }: Props) {
  const open = useGame((s) => s.doors[door]);
  const state = useGame((s) => doorState(s.progress, lock));
  const at: [number, number, number] = [hinge[0], 1.2, hinge[2]];
  const turning = useRef(false);
  const keyName = KEY_NAMES[LOCK_KEY[lock]];
  return (
    <Door
      id={id}
      hinge={hinge}
      rotationY={rotationY}
      width={width}
      height={height}
      open={open}
      plaqueText={[room, '']}
      label={() => {
        if (state === 'open' || game().zone === inside) return open ? 'Close the door' : `Open ${room.replace(/^The /, 'the ')}`;
        const name = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        return state === 'unlockable' ? `Unlock the door with ${name.replace(/^The /, 'the ')}` : `${room} (locked)`;
      }}
      onUse={() => {
        const g = useGame.getState();
        if (turning.current) return;
        if (state === 'open' || g.zone === inside) {
          g.setDoor(door, !open);
          if (open) audio.doorClose(at);
          else audio.doorOpen(at, true);
          return;
        }
        if (state === 'locked') {
          audio.locked(at);
          g.showNotice(`${room} is locked.`, lockedHint());
          return;
        }
        // The key turns: a scrape, the bolt, a pause, then the door swings open.
        turning.current = true;
        const wait = audio.unlockDoor(at);
        const Key = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        g.showNotice(`${Key} turns in the lock.`, `${room} is open.`);
        window.setTimeout(() => {
          const s2 = useGame.getState();
          s2.progressDispatch(lock === 'gallery' ? { type: 'UNLOCK_GALLERY' } : { type: 'UNLOCK', lock });
          s2.setDoor(door, true);
          audio.doorOpen(at, true);
          turning.current = false;
        }, wait);
      }}
    />
  );
}

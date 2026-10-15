import { useRef } from 'react';
import { game, useGame } from '../state/store';
import { galleryDoorState } from '../lesson/progression';
import { ArtPainting } from './parts/Artwork';
import { audio } from '../systems/audio';
import { boxGeo } from '../systems/geometry';
import { mats } from '../systems/materials';
import { CORRIDOR, WALL_T } from '../world/layout';
import { Architrave, Cornice, OnWall, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { Door } from './parts/Door';
import { Sconce } from './parts/Lights';
import { ConsoleTable, Rug } from './parts/Furnishings';

const { x0, x1, zStart, zEnd, height } = CORRIDOR;
const DOOR_W = 0.96;
const DOOR_H = 2.3;

export function Corridor() {
  const m = mats();
  const showNotice = useGame((s) => s.showNotice);
  const left = CORRIDOR.lockedDoors.filter((d) => d.side < 0);
  const right = CORRIDOR.lockedDoors.filter((d) => d.side > 0);
  const md = CORRIDOR.mirrorDoor;

  return (
    <group>
      <Slab x0={x0} x1={x1} z0={zEnd} z1={zStart} y={0} material={m.floorHall} />
      <Slab x0={x0} x1={x1} z0={zEnd} z1={zStart} y={height} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zEnd} z1={zStart} y={height} />
      <Rug position={[0, 0, (zStart + zEnd) / 2 + 0.2]} w={0.95} d={7.2} material={m.runner} />

      <Wall axis="z" from={zStart} to={zEnd} at={x0 - WALL_T / 2} height={Math.max(height, 5.2)} openings={left.map((d) => ({ c: d.z, w: DOOR_W, b: 0, t: DOOR_H }))} matPos={m.wallCorridor} matNeg={m.wallGallery} />
      <Wall axis="z" from={zStart} to={zEnd} at={x1 + WALL_T / 2} height={height} openings={right.map((d) => ({ c: d.z, w: DOOR_W, b: 0, t: DOOR_H }))} matPos={m.wallCorridor} matNeg={m.wallCorridor} />

      <OnWall axis="z" face={x0} normal={1}>
        <Wainscot x0={wallLocal('z', 1, zStart)} x1={wallLocal('z', 1, zEnd)} gaps={left.map((d) => [wallLocal('z', 1, d.z), DOOR_W + 0.36] as [number, number])} />
        {left.map((d) => (
          <Architrave key={d.z} c={wallLocal('z', 1, d.z)} w={DOOR_W} h={DOOR_H} />
        ))}
        <Sconce x={wallLocal('z', 1, -11.2)} y={1.95} seed={31} intensity={3.2} />
        <Sconce x={wallLocal('z', 1, -16.6)} y={1.95} seed={32} light={false} />
        <ArtPainting id="whisperingWalls" x={wallLocal('z', 1, -14.95)} y={1.95} width={0.62} />
      </OnWall>
      <OnWall axis="z" face={x1} normal={-1}>
        <Wainscot x0={wallLocal('z', -1, zStart)} x1={wallLocal('z', -1, zEnd)} gaps={right.map((d) => [wallLocal('z', -1, d.z), DOOR_W + 0.36] as [number, number])} />
        {right.map((d) => (
          <Architrave key={d.z} c={wallLocal('z', -1, d.z)} w={DOOR_W} h={DOOR_H} />
        ))}
        <Sconce x={wallLocal('z', -1, -17.2)} y={1.95} seed={33} intensity={3.2} />
        <ArtPainting id="coldFeet" x={wallLocal('z', -1, -12.3)} y={1.95} width={0.62} />
      </OnWall>
      <ConsoleTable position={[x1, 0, -12.3]} rotationY={-Math.PI / 2} w={1.0} d={0.36} h={0.8} />
      <mesh geometry={boxGeo(0.12, 0.3, 0.12)} material={m.brass} position={[x1 - 0.18, 0.95, -12.6]} castShadow />

      {/* The Portrait Gallery (opened with the Mirror Key) and a door to a room not yet built */}
      {CORRIDOR.lockedDoors.map((d) => {
        const hingeX = d.side < 0 ? x0 - WALL_T / 2 : x1 + WALL_T / 2;
        // Leaf faces into the corridor; hinge at the front edge of the opening.
        const rotationY = d.side < 0 ? Math.PI / 2 : -Math.PI / 2;
        const hingeZ = d.side < 0 ? d.z + DOOR_W / 2 : d.z - DOOR_W / 2;
        if (d.side < 0) return <GalleryDoor key={d.z} hinge={[hingeX, 0, hingeZ]} rotationY={rotationY} />;
        return (
          <Door
            key={d.z}
            id={`locked-${d.z}`}
            hinge={[hingeX, 0, hingeZ]}
            rotationY={rotationY}
            width={DOOR_W}
            height={DOOR_H}
            open={false}
            label={() => `${d.room} (locked)`}
            plaqueText={[d.room, 'Locked']}
            onUse={() => {
              audio.locked([hingeX, 1, d.z]);
              if (game().progress.keys.galleryKey) showNotice('The Gallery Key slides into the lock, but it will not turn.', 'Not yet. This room opens in the next chapter.');
              else showNotice(`${d.room} is locked.`, 'The keyhole is shaped like a word you have not learned yet.');
            }}
          />
        );
      })}

      {/* Door to the Hall of Mirrors (the end wall belongs to the mirror room) */}
      <OnWall axis="x" face={zEnd} normal={1}>
        <Wainscot x0={x0} x1={x1} gaps={[[0, md.width + 0.36]]} />
        <Architrave c={0} w={md.width} h={md.height} material={m.walnut} />
      </OnWall>
      <MirrorDoor />
    </group>
  );
}

/**
 * The Portrait Gallery door. Locked until the Mirror Key is turned in it;
 * after that it stays unlocked and opens like any other door.
 * From the inside the lock always turns, so nobody can be shut in.
 */
function GalleryDoor({ hinge, rotationY }: { hinge: [number, number, number]; rotationY: number }) {
  const open = useGame((s) => s.doors.gallery);
  const state = useGame((s) => galleryDoorState(s.progress));
  const at: [number, number, number] = [hinge[0], 1.2, CORRIDOR.lockedDoors[0].z];
  const turning = useRef(false);
  return (
    <Door
      id="gallery-door"
      hinge={hinge}
      rotationY={rotationY}
      width={DOOR_W}
      height={DOOR_H}
      open={open}
      plaqueText={['The Portrait Gallery', '']}
      label={() => {
        if (state === 'open' || game().zone === 'gallery') return open ? 'Close the door' : 'Open the Portrait Gallery';
        return state === 'unlockable' ? 'Unlock the door with the Mirror Key' : 'The Portrait Gallery (locked)';
      }}
      onUse={() => {
        const g = useGame.getState();
        if (turning.current) return;
        if (state === 'open' || g.zone === 'gallery') {
          g.setDoor('gallery', !open);
          if (open) audio.doorClose(at);
          else audio.doorOpen(at, true);
          return;
        }
        if (state === 'locked') {
          audio.locked(at);
          g.showNotice('The Portrait Gallery is locked.', g.progress.completed.mirrors ? 'Did you take the key from the Hall of Mirrors?' : 'Perhaps another room holds the key.');
          return;
        }
        // The Mirror Key turns: a scrape, the bolt, a pause, then the door swings in.
        turning.current = true;
        audio.unlockDoor(at);
        g.showNotice('The Mirror Key turns in the lock.', 'The Portrait Gallery is open.');
        window.setTimeout(() => {
          const s2 = useGame.getState();
          s2.progressDispatch({ type: 'UNLOCK_GALLERY' });
          s2.setDoor('gallery', true);
          audio.doorOpen(at, true);
          turning.current = false;
        }, 1100);
      }}
    />
  );
}

function MirrorDoor() {
  const md = CORRIDOR.mirrorDoor;
  const open = useGame((s) => s.doors.mirror);
  const setDoor = useGame((s) => s.setDoor);
  const z = zEnd - WALL_T / 2;
  return (
    <Door
      id="mirror-door"
      hinge={[-md.width / 2, 0, z]}
      rotationY={0}
      width={md.width}
      height={md.height}
      open={open}
      swing={1}
      maxAngle={1.6}
      plaqueText={['The Hall of Mirrors', 'Look closer']}
      material={mats().mahogany}
      label={() => (open ? 'Close the door' : 'Open the door to the Hall of Mirrors')}
      onUse={() => {
        setDoor('mirror', !open);
        if (open) audio.doorClose([0, 1.4, z]);
        else audio.doorOpen([0, 1.4, z], true);
      }}
    />
  );
}

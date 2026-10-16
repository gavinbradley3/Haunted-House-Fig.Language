import { game, useGame } from '../state/store';
import { ArtPainting } from './parts/Artwork';
import { audio } from '../systems/audio';
import { boxGeo } from '../systems/geometry';
import { mats } from '../systems/materials';
import { CORRIDOR, WALL_T } from '../world/layout';
import { Architrave, Cornice, OnWall, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { Door } from './parts/Door';
import { KeyedDoor } from './parts/KeyedDoor';
import { Sconce } from './parts/Lights';
import { ConsoleTable, Rug } from './parts/Furnishings';

const { x0, x1, zStart, zEnd, height } = CORRIDOR;
const DOOR_W = 0.96;
const DOOR_H = 2.3;

export function Corridor() {
  const m = mats();
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
      <Wall axis="z" from={zStart} to={zEnd} at={x1 + WALL_T / 2} height={height} openings={right.map((d) => ({ c: d.z, w: DOOR_W, b: 0, t: DOOR_H }))} matPos={m.wallDining} matNeg={m.wallCorridor} />

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

      {/* The Portrait Gallery (opened with the Mirror Key) and the Giant's Dining Room (the Gallery Key) */}
      {CORRIDOR.lockedDoors.map((d) => {
        const hingeX = d.side < 0 ? x0 - WALL_T / 2 : x1 + WALL_T / 2;
        // Leaf faces into the corridor; hinge at the front edge of the opening.
        const rotationY = d.side < 0 ? Math.PI / 2 : -Math.PI / 2;
        const hingeZ = d.side < 0 ? d.z + DOOR_W / 2 : d.z - DOOR_W / 2;
        if (d.side < 0)
          return (
            <KeyedDoor
              key={d.z}
              id="gallery-door"
              door="gallery"
              lock="gallery"
              room={d.room}
              inside="gallery"
              hinge={[hingeX, 0, hingeZ]}
              rotationY={rotationY}
              width={DOOR_W}
              height={DOOR_H}
              lockedHint={() => (game().progress.completed.mirrors ? 'Did you take the key from the Hall of Mirrors?' : 'Perhaps another room holds the key.')}
            />
          );
        return (
          <KeyedDoor
            key={d.z}
            id="dining-door"
            door="dining"
            lock="dining"
            room={d.room}
            inside="dining"
            hinge={[hingeX, 0, hingeZ]}
            rotationY={rotationY}
            width={DOOR_W}
            height={DOOR_H}
            lockedHint={() => (game().progress.completed.gallery ? 'Did you take the key from the Portrait Gallery?' : 'The keyhole is shaped like a word you have not learned yet.')}
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

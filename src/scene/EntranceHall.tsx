import { useMemo } from 'react';
import * as THREE from 'three';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boxGeo, latheGeo, LATHES, profileGeo, PROFILES, runTransform } from '../systems/geometry';
import { mats } from '../systems/materials';
import { HALL, KITCHEN, STUDY, WALL_T } from '../world/layout';
import { KeyedDoor } from './parts/KeyedDoor';
import { Architrave, CeilingRose, Cornice, OnWall, PanelField, Run, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { Door, DoorLeaf } from './parts/Door';
import { CandleLight, Chandelier, Sconce } from './parts/Lights';
import {
  Candelabrum,
  CentreTable,
  CoatStand,
  ConsoleTable,
  GrandfatherClock,
  Rug,
  SashWindow,
  Settle,
  SideChair,
  Stanchions,
} from './parts/Furnishings';
import { Fireplace } from './parts/Fireplace';
import { Interactive } from './Interactive';
import { ArtPainting, Painting } from './parts/Artwork';

const { x0, x1, zFront, zBack, height } = HALL;
const L = HALL.landing;
const S = HALL.stair;

function Staircase() {
  const m = mats();
  const risers = 19;
  const rise = S.rise / risers;
  const going = (S.zStart - S.zEnd) / risers;
  const width = S.x1 - S.x0;
  const cx = (S.x0 + S.x1) / 2;
  const baluster = latheGeo('baluster', LATHES.baluster, 12);
  const newelCap = latheGeo('newelCap', LATHES.newelCap);
  const steps = Array.from({ length: risers - 1 }, (_, i) => i);
  // Sloped handrail and string
  const rail = useMemo(() => {
    const a = new THREE.Vector3(S.x1 - 0.02, rise + 0.9, S.zStart - going * 0.5);
    const b = new THREE.Vector3(S.x1 - 0.02, S.rise + 0.9, S.zEnd);
    const dir = b.clone().sub(a).normalize();
    const normal = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(dir, normal).normalize();
    return runTransform(a, b, normal, up.y > 0 ? up : up.negate());
  }, [rise, going]);
  const string = useMemo(() => {
    const len = Math.hypot(S.zStart - S.zEnd, S.rise);
    const angle = Math.atan2(S.rise, S.zStart - S.zEnd);
    return { len, angle };
  }, []);
  return (
    <group>
      {steps.map((i) => {
        const top = (i + 1) * rise;
        const zA = S.zStart - i * going;
        const zc = zA - going / 2;
        return (
          <group key={i}>
            <mesh geometry={boxGeo(width, top, going)} material={m.walnut} position={[cx, top / 2, zc]} castShadow receiveShadow />
            {/* Bullnosed tread */}
            <mesh geometry={boxGeo(width + 0.04, 0.03, going + 0.035, 'x')} material={m.walnut} position={[cx + 0.02, top - 0.015, zc + 0.017]} castShadow receiveShadow />
            {/* Runner on tread and riser, with a brass stair rod */}
            <mesh material={m.runner} position={[cx + 0.05, top + 0.003, zc + 0.01]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
              <planeGeometry args={[going + 0.02, 0.9]} />
            </mesh>
            <mesh material={m.runner} position={[cx + 0.05, top - rise / 2, zA + 0.037]} rotation={[0, 0, Math.PI / 2]}>
              <planeGeometry args={[rise, 0.9]} />
            </mesh>
            <mesh material={m.brass} position={[cx + 0.05, top - rise + 0.012, zA + 0.035]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, 0.98, 6]} />
            </mesh>
            {[0.25, 0.75].map((f) => (
              <mesh key={f} geometry={baluster} material={m.mahogany} position={[S.x1 - 0.04, top, zA - going * f]} scale={[1, (0.9 - 0.02) / 0.8, 1]} castShadow />
            ))}
          </group>
        );
      })}
      {/* Closed string on the open side */}
      <mesh
        geometry={boxGeo(0.05, 0.3, string.len)}
        material={m.walnut}
        position={[S.x1 + 0.0, S.rise / 2 + 0.05, (S.zStart + S.zEnd) / 2]}
        rotation={[string.angle, 0, 0]}
        castShadow
      />
      <mesh geometry={profileGeo('handrail', PROFILES.handrail, rail.length)} material={m.mahogany} matrix={rail.matrix} matrixAutoUpdate={false} castShadow />
      {/* Newel posts */}
      {[
        [S.x1 - 0.04, 0, S.zStart + 0.05, 1.25],
        [S.x1 - 0.04, S.rise - 0.3, S.zEnd, 1.4],
      ].map(([x, y, z, h], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh geometry={boxGeo(0.16, h, 0.16)} material={m.mahogany} position={[0, h / 2, 0]} castShadow />
          <mesh geometry={boxGeo(0.2, 0.06, 0.2)} material={m.mahogany} position={[0, h, 0]} castShadow />
          <mesh geometry={newelCap} material={m.mahogany} position={[0, h + 0.03, 0]} castShadow />
          <mesh geometry={boxGeo(0.2, 0.18, 0.2)} material={m.mahogany} position={[0, 0.09, 0]} />
        </group>
      ))}
      {/* Spandrel panelling under the stair */}
      <OnWall axis="z" face={S.x1 + 0.025} normal={1}>
        <group>
          <PanelField x0={wallLocal('z', 1, S.zStart - 1.2)} x1={wallLocal('z', 1, S.zEnd + 0.1)} y0={0.2} y1={0.9} cols={4} material={m.walnutPanel} />
        </group>
      </OnWall>
    </group>
  );
}

function Landing() {
  const m = mats();
  const baluster = latheGeo('baluster', LATHES.baluster, 12);
  const edgeZ = L.zEdge;
  const railY = L.y + 0.92;
  const balX = useMemo(() => {
    const out: number[] = [];
    for (let x = S.x1 + 0.12; x < x1 - 0.1; x += 0.16) out.push(x);
    return out;
  }, []);
  return (
    <group>
      {/* Floor of the landing */}
      <mesh geometry={boxGeo(x1 - x0, L.thick, zBack - edgeZ < 0 ? edgeZ - zBack : 0)} material={m.walnut} position={[0, L.y - L.thick / 2, (edgeZ + zBack) / 2]} castShadow receiveShadow />
      <mesh material={m.floorHall} position={[0, L.y + 0.002, (edgeZ + zBack) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[x1 - x0, edgeZ - zBack]} />
      </mesh>
      {/* Plaster soffit under the landing */}
      <mesh material={m.ceiling} position={[0, L.y - L.thick - 0.001, (edgeZ + zBack) / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[x1 - x0, edgeZ - zBack]} />
      </mesh>
      {/* Fascia with a moulding */}
      <OnWall axis="x" face={edgeZ} normal={1}>
        <mesh geometry={boxGeo(x1 - x0, L.thick + 0.08, 0.04)} material={m.walnut} position={[0, L.y - L.thick / 2 - 0.02, 0.02]} castShadow />
        <Run profile="dado" x0={x0} x1={x1} y={L.y - L.thick - 0.05} z={0.04} material={m.walnut} />
      </OnWall>
      {/* Balustrade */}
      {balX.map((x) => (
        <mesh key={x} geometry={baluster} material={m.mahogany} position={[x, L.y, edgeZ + 0.05]} scale={[1, 0.9 / 0.8, 1]} castShadow />
      ))}
      <mesh geometry={boxGeo(x1 - S.x1, 0.07, 0.09, 'x')} material={m.mahogany} position={[(x1 + S.x1) / 2, railY, edgeZ + 0.05]} castShadow />
      <mesh geometry={boxGeo(x1 - S.x1, 0.05, 0.07, 'x')} material={m.mahogany} position={[(x1 + S.x1) / 2, L.y + 0.02, edgeZ + 0.05]} />
      {/* Columns supporting the landing either side of the corridor arch */}
      {[-1.45, 1.45].map((x) => (
        <group key={x} position={[x, 0, edgeZ + 0.25]}>
          <mesh geometry={boxGeo(0.3, 0.2, 0.3)} material={m.walnut} position={[0, 0.1, 0]} castShadow />
          <mesh geometry={latheGeo('hallCol', [
            [0, 0],
            [0.12, 0],
            [0.12, 0.05],
            [0.1, 0.1],
            [0.095, L.y - L.thick - 0.45],
            [0.11, L.y - L.thick - 0.35],
            [0.15, L.y - L.thick - 0.2],
            [0, L.y - L.thick - 0.2],
          ])} material={m.walnut} position={[0, 0.2, 0]} castShadow />
          <mesh geometry={boxGeo(0.34, 0.2, 0.34)} material={m.walnut} position={[0, L.y - L.thick - 0.1, 0]} castShadow />
        </group>
      ))}
    </group>
  );
}

export function EntranceHall() {
  const m = mats();
  const frontDoorOpen = useGame((s) => s.doors.front);
  const setDoor = useGame((s) => s.setDoor);
  const showNotice = useGame((s) => s.showNotice);
  const fd = HALL.frontDoor;
  const win = HALL.window;
  const uw = HALL.upperWindow;
  const ft = HALL.fireplace;
  const fanlightB = fd.height + 0.12;
  const fanlightT = fd.height + 0.85;

  const frontOpenings = [
    { c: fd.x, w: fd.width, b: 0, t: fd.height },
    { c: fd.x, w: fd.width, b: fanlightB, t: fanlightT },
    ...HALL.frontWindows.flatMap((c) => [
      { c, w: win.width, b: win.sill, t: win.top },
      { c, w: win.width, b: uw.sill, t: uw.top },
    ]),
  ];
  const leafW = fd.width / 2;

  return (
    <group>
      {/* Floor, ceiling */}
      <Slab x0={x0} x1={x1} z0={zBack} z1={zFront} y={0} material={m.floorHall} />
      <Slab x0={x0} x1={x1} z0={zBack} z1={zFront} y={height} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zBack} z1={zFront} y={height} />
      <CeilingRose position={[0.6, height, -4.6]} r={0.55} />

      {/* Walls */}
      <Wall axis="x" from={x0 - WALL_T} to={x1 + WALL_T} at={zFront + WALL_T / 2} height={height + 0.4} openings={frontOpenings} matPos={m.brick} matNeg={m.wallHall} />
      <Wall axis="x" from={x0 - WALL_T} to={x1 + WALL_T} at={zBack - WALL_T / 2} height={height} openings={[{ c: 0, w: HALL.corridorOpening.width, b: 0, t: HALL.corridorOpening.height }]} matPos={m.wallHall} matNeg={m.wallCorridor} />
      <Wall axis="z" from={zFront} to={zBack} at={x0 - WALL_T / 2} height={height} openings={[{ c: STUDY.doorZ, w: 0.96, b: 0, t: 2.3 }]} matPos={m.wallHall} matNeg={m.wallStudy} />
      <Wall axis="z" from={zFront} to={zBack} at={x1 + WALL_T / 2} height={height} openings={[{ c: KITCHEN.doorZ, w: 0.96, b: 0, t: 2.3 }]} matPos={m.wallKitchen} matNeg={m.wallHall} />

      {/* --- Front wall interior --- */}
      <OnWall axis="x" face={zFront} normal={-1}>
        <Wainscot x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} gaps={[[0, fd.width + 0.36], ...HALL.frontWindows.map((c) => [wallLocal('x', -1, c), win.width + 0.1] as [number, number])]} />
        {HALL.frontWindows.map((c) => (
          <group key={c}>
            <PanelField x0={wallLocal('x', -1, c) - win.width / 2 - 0.05} x1={wallLocal('x', -1, c) + win.width / 2 + 0.05} y0={0.2} y1={win.sill - 0.04} cols={2} material={m.walnutPanel} />
            <Run profile="skirting" x0={wallLocal('x', -1, c) - win.width / 2 - 0.05} x1={wallLocal('x', -1, c) + win.width / 2 + 0.05} y={0} material={m.walnutPanel} />
            <SashWindow c={wallLocal('x', -1, c)} w={win.width} b={win.sill} t={win.top} />
            <SashWindow c={wallLocal('x', -1, c)} w={win.width} b={uw.sill} t={uw.top} drapes={false} />
            <Architrave c={wallLocal('x', -1, c)} w={win.width} h={win.top} material={m.walnut} />
          </group>
        ))}
        <Architrave c={0} w={fd.width} h={fanlightT} />
        {/* Fanlight glazing */}
        <group position={[0, (fanlightB + fanlightT) / 2, -WALL_T / 2]}>
          <mesh geometry={boxGeo(fd.width, fanlightT - fanlightB, 0.004)} material={m.glass} />
          {[-0.6, -0.2, 0.2, 0.6].map((x) => (
            <mesh key={x} geometry={boxGeo(0.03, fanlightT - fanlightB, 0.05)} material={m.paintTrim} position={[x * fd.width * 0.5 * 1.6, 0, 0]} />
          ))}
        </group>
        <mesh geometry={boxGeo(fd.width, 0.12, WALL_T)} material={m.walnut} position={[0, fd.height + 0.06, -WALL_T / 2]} castShadow />
        <Run profile="dado" x0={-x1} x1={-x0} y={L.y - 0.1} material={m.walnut} />
        <Run profile="pictureRail" x0={-x1} x1={-x0} y={5.95} material={m.walnut} />
        <Sconce x={-2.05} y={2.15} seed={1} light={false} />
        <Sconce x={2.05} y={2.15} seed={2} light={false} />
      </OnWall>

      {/* Front double doors (inward swing) */}
      <Door
        id="front-left"
        hinge={[fd.x - fd.width / 2, 0, zFront + WALL_T / 2]}
        rotationY={0}
        width={leafW}
        height={fd.height}
        open={frontDoorOpen}
        swing={1}
        maxAngle={1.45}
        label={() => (frontDoorOpen ? 'Close the front door' : 'Open the front door')}
        onUse={() => {
          setDoor('front', !frontDoorOpen);
          if (frontDoorOpen) audio.doorClose([0, 1.5, zFront]);
          else audio.doorOpen([0, 1.5, zFront]);
        }}
      />
      <FrontRightLeaf open={frontDoorOpen} width={leafW} height={fd.height} hinge={[fd.x + fd.width / 2, 0, zFront + WALL_T / 2]} />

      {/* --- Back wall (under the landing) --- */}
      <OnWall axis="x" face={zBack} normal={1}>
        <Wainscot x0={x0} x1={x1} gaps={[[0, HALL.corridorOpening.width + 0.36]]} />
        <Architrave c={0} w={HALL.corridorOpening.width} h={HALL.corridorOpening.height} />
        <Sconce x={-1.6} y={2.0} seed={3} intensity={4.5} />
        <Sconce x={1.6} y={2.0} seed={4} light={false} />
        <ArtPainting id="houseBreath" x={-4.0} y={2.15} width={1.0} />
        {/* Upper floor: landing doors and wainscot */}
        <group position={[0, L.y, 0]}>
          <Wainscot x0={x0} x1={x1} gaps={[[-2.6, 1.3], [2.6, 1.3]]} />
          {[-2.6, 2.6].map((x) => (
            <group key={x}>
              <group position={[x - 0.48, 0, 0.03]}>
                <DoorLeaf width={0.96} height={2.3} />
              </group>
              <Architrave c={x} w={0.96} h={2.3} />
            </group>
          ))}
          <Painting x={0} y={1.75} w={1.1} art="D01" />
        </group>
      </OnWall>
      {/* Door voids behind the landing doors */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} geometry={boxGeo(0.96, 2.3, 0.02)} material={m.darkInterior} position={[x, L.y + 1.15, zBack + 0.01]} />
      ))}

      {/* --- Left wall --- */}
      <OnWall axis="z" face={x0} normal={1}>
        <Wainscot x0={wallLocal('z', 1, zFront)} x1={wallLocal('z', 1, S.zStart + 0.05)} />
        <Wainscot x0={wallLocal('z', 1, S.zEnd)} x1={wallLocal('z', 1, zBack)} height={1.12} gaps={[[wallLocal('z', 1, STUDY.doorZ), 0.96 + 0.36]]} />
        <Architrave c={wallLocal('z', 1, STUDY.doorZ)} w={0.96} h={2.3} />
        <group position={[0, L.y, 0]}>
          <Wainscot x0={wallLocal('z', 1, L.zEdge)} x1={wallLocal('z', 1, zBack)} />
        </group>
        {/* Raking dado rail following the stair */}
        <StairDado />
        <Painting x={wallLocal('z', 1, -3.4)} y={3.15} w={0.75} art="D02" />
        <Painting x={wallLocal('z', 1, -5.6)} y={4.1} w={0.85} art="D03" />
        <Run profile="pictureRail" x0={wallLocal('z', 1, zFront)} x1={wallLocal('z', 1, zBack)} y={5.95} material={m.walnut} />
      </OnWall>

      {/* --- Right wall with fireplace --- */}
      <OnWall axis="z" face={x1} normal={-1}>
        <Wainscot x0={wallLocal('z', -1, zFront)} x1={wallLocal('z', -1, zBack)} gaps={[[wallLocal('z', -1, ft.z), 2.4], [wallLocal('z', -1, KITCHEN.doorZ), 0.96 + 0.36]]} />
        <Architrave c={wallLocal('z', -1, KITCHEN.doorZ)} w={0.96} h={2.3} />
        <Fireplace x={wallLocal('z', -1, ft.z)} ceiling={height} />
        <Sconce x={wallLocal('z', -1, -1.9)} y={2.2} seed={5} light={false} />
        <Sconce x={wallLocal('z', -1, -7.4)} y={2.2} seed={6} intensity={4.5} />
        <Run profile="dado" x0={wallLocal('z', -1, zFront)} x1={wallLocal('z', -1, zBack)} y={L.y - 0.1} material={m.walnut} />
        <Run profile="pictureRail" x0={wallLocal('z', -1, zFront)} x1={wallLocal('z', -1, zBack)} y={5.95} material={m.walnut} />
        <Painting x={wallLocal('z', -1, -1.9)} y={4.4} w={0.9} art="D04" />
        <Painting x={wallLocal('z', -1, -8.6)} y={4.6} w={0.8} art="D05" />
      </OnWall>

      {/* Room 9 (under the landing) and Room 7 (beyond the fireplace) */}
      <KeyedDoor
        id="study-door"
        door="study"
        lock="study"
        room="The Scholar’s Study"
        inside="study"
        hinge={[x0 - WALL_T / 2, 0, STUDY.doorZ + 0.48]}
        rotationY={Math.PI / 2}
        width={0.96}
        height={2.3}
        lockedHint={() => (game().progress.completed.ballroom ? 'Did you take the key from the ballroom’s glass case?' : 'The keyhole is shaped like a word you have not learned yet.')}
      />
      <KeyedDoor
        id="kitchen-door"
        door="kitchen"
        lock="kitchen"
        room="The Crooked Kitchen"
        inside="kitchen"
        hinge={[x1 + WALL_T / 2, 0, KITCHEN.doorZ - 0.48]}
        rotationY={-Math.PI / 2}
        width={0.96}
        height={2.3}
        lockedHint={() => (game().progress.completed.press ? 'Did you take the key from the printing press?' : 'The keyhole is shaped like a word you have not learned yet.')}
      />
      <Staircase />
      <Landing />
      <Stanchions a={[S.x0 + 0.25, 0, S.zStart + 0.3]} b={[S.x1 - 0.12, 0, S.zStart + 0.3]} />

      {/* Furniture */}
      <Rug position={[0.6, 0, -4.6]} w={3.0} d={4.4} material={m.rugHall} />
      <CentreTable position={[0.6, 0, -4.6]} />
      <GrandfatherClock position={[2.55, 0, zBack + 0.2]} />
      <ConsoleTable position={[-2.9, 0, zBack]} w={1.5} />
      <Candelabrum position={[-3.35, 0.84, zBack + 0.2]} room="hall" intensity={2.6} seed={7} />
      <Settle position={[x1, 0, -1.7]} rotationY={-Math.PI / 2} />
      <CoatStand position={[-1.75, 0, -0.45]} />
      <SideChair position={[-2.2, 0, zBack + 0.75]} rotationY={0.3} />
      <SideChair position={[x1 - 0.6, 0, -7.1]} rotationY={-Math.PI / 2 - 0.2} />

      {/* Lighting */}
      <Chandelier position={[0.6, height, -4.6]} drop={1.8} intensity={48} seed={11} />
      <CandleLight position={[x1 - 0.7, 0.7, ft.z]} intensity={9} distance={8} color="#ff7a32" seed={21} />

      {/* Locked upstairs: a quiet message if you try the rope */}
      <InteractRope onUse={() => showNotice('The upstairs is closed tonight.', 'Your business is on this floor.')} />
    </group>
  );
}

function StairDado() {
  const m = mats();
  const { matrix, length } = useMemo(() => {
    const a = new THREE.Vector3(wallLocal('z', 1, S.zStart), 1.05, 0);
    const b = new THREE.Vector3(wallLocal('z', 1, S.zEnd), S.rise + 1.05, 0);
    const dir = b.clone().sub(a).normalize();
    const N = new THREE.Vector3(0, 0, 1);
    const up = new THREE.Vector3().crossVectors(dir, N);
    return runTransform(a, b, N, up.y > 0 ? up : up.negate());
  }, []);
  return <mesh geometry={profileGeo('dado', PROFILES.dado, length)} material={m.walnut} matrix={matrix} matrixAutoUpdate={false} />;
}

/** The right-hand front leaf follows the left one. */
function FrontRightLeaf({ open, width, height, hinge }: { open: boolean; width: number; height: number; hinge: [number, number, number] }) {
  return (
    <Door
      id="front-right"
      hinge={hinge}
      rotationY={Math.PI}
      width={width}
      height={height}
      open={open}
      swing={-1}
      maxAngle={1.45}
      handleSide={1}
      label={() => (open ? 'Close the front door' : 'Open the front door')}
      onUse={() => {
        const s = useGame.getState();
        s.setDoor('front', !open);
        if (open) audio.doorClose([0, 1.5, 0]);
        else audio.doorOpen([0, 1.5, 0]);
      }}
    />
  );
}

function InteractRope({ onUse }: { onUse: () => void }) {
  return (
    <Interactive id="stair-rope" label={() => 'Go upstairs'} onUse={onUse}>
      <mesh position={[(S.x0 + S.x1) / 2, 0.8, S.zStart + 0.3]} visible={false}>
        <boxGeometry args={[1.4, 0.4, 0.2]} />
      </mesh>
    </Interactive>
  );
}

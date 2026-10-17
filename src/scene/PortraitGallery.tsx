/**
 * Room 2: the Portrait Gallery (METAPHOR).
 * A long, top-lit picture gallery behind the corridor's first locked door.
 */
import { useMemo, useRef, type ReactElement } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PAINTINGS } from '../content/paintings';
import { gfx } from '../lesson/galleryFx';
import { game, useGame } from '../state/store';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { GALLERY, WALL_T } from '../world/layout';
import { Cornice, OnWall, PanelField, Run, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { ArtPainting, Painting } from './parts/Artwork';
import { Stanchions } from './parts/Furnishings';
import { Sconce } from './parts/Lights';
import { CollectibleKey } from './parts/Key';
import { RoundedBox } from '@react-three/drei';

const { x0, x1, zN, zS, height } = GALLERY;
const LAY = { x0: -11.6, x1: -4.3, z0: -15.55, z1: -12.65 };

/** The glazed laylight in the ceiling. Its pale moonlight comes from the shared room lights (RoomLights). */
function Laylight() {
  const m = mats();
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141518', emissive: new THREE.Color('#5d6673'), emissiveIntensity: 0.22, roughness: 0.95 }), []);
  const w = LAY.x1 - LAY.x0;
  const d = LAY.z1 - LAY.z0;
  const cx = (LAY.x0 + LAY.x1) / 2;
  const cz = (LAY.z0 + LAY.z1) / 2;
  const bars: ReactElement[] = [];
  for (let i = 1; i < 8; i++) bars.push(<mesh key={`x${i}`} geometry={boxGeo(0.05, 0.06, d)} material={m.gilt} position={[LAY.x0 + (w * i) / 8, height - 0.05, cz]} />);
  for (let i = 1; i < 3; i++) bars.push(<mesh key={`z${i}`} geometry={boxGeo(w, 0.06, 0.05, 'x')} material={m.gilt} position={[cx, height - 0.05, LAY.z0 + (d * i) / 3]} />);
  return (
    <group>
      <mesh material={glass} position={[cx, height - 0.02, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {bars}
      {/* Coffered border around the laylight */}
      {[
        [cx, LAY.z0 - 0.15, w + 0.6, 0.3],
        [cx, LAY.z1 + 0.15, w + 0.6, 0.3],
      ].map(([x, z, ww, dd], i) => (
        <mesh key={i} geometry={boxGeo(ww, 0.22, dd, 'x')} material={m.ceiling} position={[x, height - 0.11, z]} castShadow />
      ))}
      {[LAY.x0 - 0.15, LAY.x1 + 0.15].map((x) => (
        <mesh key={x} geometry={boxGeo(0.3, 0.22, d)} material={m.ceiling} position={[x, height - 0.11, cz]} castShadow />
      ))}
    </group>
  );
}

/** Button-tufted gallery ottoman. */
function Ottoman() {
  const m = mats();
  const leg = latheGeo('ottoLeg', [
    [0, 0],
    [0.02, 0],
    [0.026, 0.06],
    [0.018, 0.14],
    [0.024, 0.2],
    [0, 0.2],
  ]);
  return (
    <group position={[GALLERY.bench.x, 0, GALLERY.bench.z]}>
      {[
        [-1.1, -0.28],
        [1.1, -0.28],
        [-1.1, 0.28],
        [1.1, 0.28],
        [0, -0.28],
        [0, 0.28],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={leg} material={m.walnut} position={[x, 0, z]} castShadow />
      ))}
      <RoundedBox args={[2.36, 0.12, 0.7]} radius={0.03} smoothness={3} material={m.walnut} position={[0, 0.25, 0]} castShadow receiveShadow />
      <RoundedBox args={[2.3, 0.18, 0.66]} radius={0.07} smoothness={4} material={m.velvetOx} position={[0, 0.4, 0]} castShadow receiveShadow />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={m.brass} position={[-1.0 + (i % 6) * 0.4, 0.492, i < 6 ? -0.15 : 0.15]}>
          <sphereGeometry args={[0.009, 6, 4]} />
        </mesh>
      ))}
    </group>
  );
}

/** The empty frame (Prove) on a hinge, and the small wall safe behind it that holds the Gallery Key. */
function EmptyFrameAndSafe() {
  const m = mats();
  const hinge = useRef<THREE.Group>(null!);
  const safeDoor = useRef<THREE.Group>(null!);
  const done = useGame((s) => s.progress.completed.gallery);
  const width = GALLERY.emptyFrame.width;
  const lx = wallLocal('z', 1, GALLERY.emptyFrame.z);
  const hingeX = lx - width / 2 - 0.12;
  useFrame(() => {
    const target = Math.max(gfx.swingTarget, game().progress.completed.gallery && game().lessons.gallery.stage !== 'complete' ? 1 : 0);
    gfx.swing += (target - gfx.swing) * (1 - Math.exp(-world.dt * 1.6));
    hinge.current.rotation.y = -gfx.swing * 1.25;
    safeDoor.current.rotation.y = -Math.max(0, gfx.swing - 0.55) * 3.2;
  });
  const sy = GALLERY.emptyFrame.y;
  return (
    <group>
      {/* Wall safe set into the panelling */}
      <group position={[lx, sy, 0]}>
        <mesh geometry={boxGeo(0.5, 0.58, 0.03)} material={m.iron} position={[0, 0, 0.015]} />
        <mesh geometry={boxGeo(0.4, 0.46, 0.02)} material={m.darkInterior} position={[0, 0, 0.031]} />
        <mesh geometry={boxGeo(0.36, 0.02, 0.1)} material={m.velvetOx} position={[0, -0.12, 0.04]} />
        <group position={[0.02, -0.098, 0.06]} rotation={[-Math.PI / 2, 0, -0.4]}>
          <CollectibleKey keyId="galleryKey" variant="gallery" tint="#a8884a" />
        </group>
        <group ref={safeDoor} position={[-0.2, 0, 0.036]}>
          <mesh geometry={boxGeo(0.4, 0.46, 0.025)} material={m.iron} position={[0.2, 0, 0.012]} />
          <mesh material={m.brass} position={[0.32, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.015, 24]} />
          </mesh>
        </group>
      </group>
      <group ref={hinge} position={[hingeX, 0, 0.0]}>
        <ArtPainting
          id="emptyFrame"
          art="emptyCanvas"
          x={width / 2 + 0.12}
          y={sy}
          width={width}
          frame="ornateFrame"
          fx={gfx.frame}
          pictureLight={0}
          nameplate={() => (gfx.frame.text ? 'Untitled, awaiting a title' : 'Untitled')}
          label={() => (game().lessonActive || game().inspecting || done ? null : 'Look at the empty frame')}
        />
      </group>
    </group>
  );
}

/** The large portrait at the end of the gallery: the lesson begins here. */
function CaretakerWall() {
  const m = mats();
  const lx = wallLocal('z', 1, GALLERY.caretaker.z);
  return (
    <group>
      <ArtPainting
        id="caretaker"
        x={lx}
        y={GALLERY.caretaker.y}
        width={GALLERY.caretaker.width}
        frame="ornateFrame"
        fx={gfx.caretaker}
        pictureLight={7}
        nameplate={() => PAINTINGS.caretaker.title}
      />
      {/* Pedestals with urns either side */}
      {[-1.25, 1.25].map((dz) => (
        <group key={dz} position={[lx + dz, 0, 0.45]}>
          <mesh geometry={latheGeo('pedestal', LATHES.pedestal)} material={m.marbleDark} scale={[0.6, 1.4, 0.6]} castShadow />
          <mesh geometry={latheGeo('urn', LATHES.urn)} material={m.ceramic} position={[0, 0.98, 0]} scale={0.8} castShadow />
        </group>
      ))}
    </group>
  );
}

export function PortraitGallery() {
  const m = mats();
  const oldManTitle = () => (game().lessons.gallery.playA.solved || game().progress.completed.gallery ? PAINTINGS.oldManShadow.title : null);

  return (
    <group>
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={0} material={m.floorDark} />
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={height} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zS} z1={zN} y={height} />
      <Laylight />

      {/* Walls: north, south, west. The east wall is the corridor's. */}
      <Wall axis="x" from={x0 - WALL_T} to={x1} at={zN + WALL_T / 2} height={height} matPos={m.wallCorridor} matNeg={m.wallGallery} />
      <Wall axis="x" from={x0 - WALL_T} to={x1} at={zS - WALL_T / 2} height={height} matPos={m.wallGallery} matNeg={m.brick} />
      <Wall axis="z" from={zN} to={zS} at={x0 - WALL_T / 2} height={height} matPos={m.wallGallery} matNeg={m.brick} />

      {/* --- West wall: the caretaker, the empty frame, the silent hall --- */}
      <OnWall axis="z" face={x0} normal={1}>
        <Wainscot x0={wallLocal('z', 1, zN)} x1={wallLocal('z', 1, zS)} height={1.3} />
        <Run profile="pictureRail" x0={wallLocal('z', 1, zN)} x1={wallLocal('z', 1, zS)} y={4.3} material={m.gilt} />
        <CaretakerWall />
        <EmptyFrameAndSafe />
        <ArtPainting id="deafeningSilence" x={wallLocal('z', 1, GALLERY.silence.z)} y={GALLERY.silence.y} width={GALLERY.silence.width} />
      </OnWall>
      <Stanchions a={[x0 + 1.05, 0, GALLERY.caretaker.z - 0.95]} b={[x0 + 1.05, 0, GALLERY.caretaker.z + 0.95]} />

      {/* --- South wall: the old man (Challenge A) --- */}
      <OnWall axis="x" face={zS} normal={1}>
        <Wainscot x0={x0} x1={x1} height={1.3} />
        <Run profile="pictureRail" x0={x0} x1={x1} y={4.3} material={m.gilt} />
        <ArtPainting id="oldManShadow" x={GALLERY.oldMan.x} y={GALLERY.oldMan.y} width={GALLERY.oldMan.width} fx={gfx.oldMan} pictureLight={4} nameplate={oldManTitle} />
        <Painting x={-6.3} y={2.4} w={1.15} art="D06" />
        <Painting x={-3.3} y={2.0} w={0.6} art="D07" />
        <Sconce x={-12.4} y={2.3} seed={71} light={false} />
      </OnWall>

      {/* --- North wall: the lady who waits (Challenge B) --- */}
      <OnWall axis="x" face={zN} normal={-1}>
        <Wainscot x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} height={1.3} />
        <Run profile="pictureRail" x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} y={4.3} material={m.gilt} />
        <ArtPainting id="nervousSitter" x={wallLocal('x', -1, GALLERY.sitter.x)} y={GALLERY.sitter.y} width={GALLERY.sitter.width} fx={gfx.sitter} pictureLight={4} nameplate={() => PAINTINGS.nervousSitter.title} />
        <Painting x={wallLocal('x', -1, -6.3)} y={2.4} w={1.1} art="D08" />
        <Painting x={wallLocal('x', -1, -3.3)} y={2.0} w={0.55} art="D09" />
        <Sconce x={wallLocal('x', -1, -12.4)} y={2.3} seed={72} light={false} />
      </OnWall>

      {/* --- East wall (gallery side of the corridor wall), around the door --- */}
      <OnWall axis="z" face={x1} normal={-1}>
        <Wainscot x0={wallLocal('z', -1, zN)} x1={wallLocal('z', -1, zS)} height={1.3} gaps={[[wallLocal('z', -1, GALLERY.doorZ), 0.96 + 0.36]]} />
        <PanelField x0={wallLocal('z', -1, -14.4)} x1={wallLocal('z', -1, -17.2)} y0={1.6} y1={3.9} cols={2} material={m.walnutPanel} />
        <Sconce x={wallLocal('z', -1, -11.55)} y={2.15} seed={73} light={false} />
        <Sconce x={wallLocal('z', -1, -14.25)} y={2.15} seed={74} light={false} />
        <Run profile="pictureRail" x0={wallLocal('z', -1, zN)} x1={wallLocal('z', -1, zS)} y={4.3} material={m.gilt} />
      </OnWall>

      <Ottoman />
      {/* Corner pedestals */}
      {[zN - 0.45, zS + 0.45].map((z) => (
        <group key={z} position={[x0 + 0.45, 0, z]}>
          <mesh geometry={latheGeo('pedestal', LATHES.pedestal)} material={m.marbleCream} scale={[0.75, 1.5, 0.75]} castShadow />
          <mesh geometry={latheGeo('vase', LATHES.vase)} material={m.ceramic} position={[0, 1.05, 0]} castShadow />
        </group>
      ))}
    </group>
  );
}

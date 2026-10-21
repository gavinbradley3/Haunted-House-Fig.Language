/**
 * The Last Dance: the two rooms behind the doors on the upper landing.
 *
 *  - The Guest Records room (right-hand door): the guest book on its reading stand, nine coats still on their
 *    hooks, a writing desk of bills and papers, and the five portraits nobody hung, under dust sheets.
 *  - The Lady's own room (left-hand door): her vanity and its mirror (facing the door, so the doorway is
 *    behind you in the glass), the music box, the green silk gown on its form, a chaise under the curtained
 *    window, her writing desk, and an empty frame beside the door.
 *
 * No lights of their own: the house's two shared room lights move here (RoomLights), and the candles are
 * emissive flames. Floors are at the landing's height.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { showCaption } from '../systems/soundCues';
import { useModel } from '../systems/models';
import { world } from '../systems/time';
import { BOUDOIR, RECORDS, UPSTAIRS } from '../world/layout';
import { HAUNT_IMAGES, hauntTexture } from '../systems/paintingImages';
import { ldFx } from '../story/fx';
import { LADY_BEHIND, lookInMirror, MIRROR_CENTRE, openLedger, openLetter, stage, takeKey } from '../story/actions';
import { LD } from '../story/lastDance';
import { DressForm } from './BallroomOfContradictions';
import { Chaise, Rug } from './parts/Furnishings';
import { Flame } from './parts/Lights';
import { MirrorGlass, ReflectionPlane } from './parts/Reflection';
import { RoomShell } from './parts/RoomShell';
import { Wall } from './parts/Architecture';
import { Interactive } from './Interactive';

const Y = UPSTAIRS.y;
/** The layer only the Lady's mirror draws: she is in the glass, and nowhere else. */
export const MIRROR_ONLY_LAYER = 7;
const MIRROR_LAYERS = [MIRROR_ONLY_LAYER];

// ------------------------------------------------------------------ painted textures

/** The guest book's open pages: nine names down the left, an empty "Left" column, and a line in green ink. */
function ledgerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ddd0b0';
  g.fillRect(0, 0, 1024, 640);
  // Foxing and the gutter's shadow
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(120, 90, 50, ${Math.random() * 0.06})`;
    g.beginPath();
    g.arc(Math.random() * 1024, Math.random() * 640, 4 + Math.random() * 30, 0, Math.PI * 2);
    g.fill();
  }
  const gut = g.createLinearGradient(472, 0, 552, 0);
  gut.addColorStop(0, 'rgba(60,40,20,0)');
  gut.addColorStop(0.5, 'rgba(60,40,20,0.45)');
  gut.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = gut;
  g.fillRect(472, 0, 80, 640);
  g.fillStyle = '#3a2a18';
  g.font = 'italic 600 38px "Cormorant Garamond", Georgia, serif';
  g.fillText('The Winter Ball', 60, 70);
  g.font = 'italic 26px "Cormorant Garamond", Georgia, serif';
  g.fillText('21st December 1874', 60, 104);
  g.fillText('Left', 640, 70);
  g.strokeStyle = 'rgba(90,60,30,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = 140 + i * 48;
    g.beginPath();
    g.moveTo(50, y);
    g.lineTo(470, y);
    g.moveTo(560, y);
    g.lineTo(980, y);
    g.stroke();
  }
  // Nine signatures in different hands (scribbles at reading distance), and their arrival times.
  g.strokeStyle = '#1f2a3a';
  for (let i = 0; i < 9; i++) {
    const y = 128 + i * 48;
    g.lineWidth = 2 + (i % 3) * 0.6;
    g.beginPath();
    let x = 64;
    g.moveTo(x, y);
    while (x < 300 + (i % 4) * 30) {
      x += 6 + Math.random() * 6;
      g.lineTo(x, y - 6 - Math.random() * 14 + (Math.random() < 0.15 ? 10 : 0));
    }
    g.stroke();
    g.fillStyle = '#2b3240';
    g.font = 'italic 24px "Cormorant Garamond", Georgia, serif';
    g.fillText(['8.05', '8.10', '8.20', '8.20', '8.35', '8.35', '8.50', '9.05', '9.40'][i], 390, y);
  }
  // The Lady's line at the foot of the right-hand page, in green ink.
  g.fillStyle = '#1f4a2c';
  g.font = 'italic 600 25px "Cormorant Garamond", Georgia, serif';
  g.fillText('I thought I could keep them safe in their portraits.', 570, 560);
  g.fillText('I did not know the house could keep them there.', 570, 592);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * The figure in the empty frame: a head and shoulders in shadow, against a dim green ground. Nobody from the
 * house: short hair, an ordinary collar. A new portrait, waiting for its name.
 */
function silhouetteTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d')!;
  const bg = g.createRadialGradient(128, 130, 10, 128, 160, 200);
  bg.addColorStop(0, '#2c3b30');
  bg.addColorStop(1, '#070908');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#050505';
  g.beginPath();
  // Shoulders and a plain collar
  g.moveTo(18, 320);
  g.bezierCurveTo(26, 236, 70, 214, 104, 206);
  g.lineTo(152, 206);
  g.bezierCurveTo(186, 214, 230, 236, 238, 320);
  g.closePath();
  g.fill();
  // Neck and head (short hair)
  g.fillRect(110, 170, 36, 44);
  g.beginPath();
  g.ellipse(128, 132, 44, 54, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(128, 104, 48, 34, 0, Math.PI, Math.PI * 2);
  g.fill();
  // A faint rim of light along one side
  g.strokeStyle = 'rgba(150, 190, 160, 0.22)';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(128, 132, 45, 55, 0, -1.2, 0.5);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ small parts

/** A candle in a brass stick, with an emissive flame (no light of its own). */
function Candle({ position, seed = 0 }: { position: [number, number, number]; seed?: number }) {
  const m = mats();
  const stick = latheGeo('candlestick', LATHES.candlestick);
  const g = useRef<THREE.Group>(null!);
  useFrame(() => {
    const k = Math.max(0.05, ldFx.candles);
    g.current.scale.setScalar(0.6 + 0.4 * k);
  });
  return (
    <group position={position}>
      <mesh geometry={stick} material={m.brass} castShadow />
      <mesh material={m.wax} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.13, 10]} />
      </mesh>
      <group ref={g} position={[0, 0.38, 0]}>
        <Flame seed={seed} scale={0.8} />
      </group>
    </group>
  );
}

/** A plain Victorian writing desk: top, apron, four turned legs. Its back is at local -z. */
function Desk({ w = 1.2, d = 0.6, h = 0.76 }: { w?: number; d?: number; h?: number }) {
  const m = mats();
  return (
    <group>
      <mesh geometry={boxGeo(w, 0.035, d)} material={m.mahogany} position={[0, h - 0.018, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(w - 0.08, 0.12, d - 0.08)} material={m.mahogany} position={[0, h - 0.1, 0]} castShadow />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={m.mahogany} position={[sx * (w / 2 - 0.06), (h - 0.1) / 2, sz * (d / 2 - 0.06)]} castShadow>
            <cylinderGeometry args={[0.022, 0.016, h - 0.1, 8]} />
          </mesh>
        )),
      )}
      {/* A drawer front with a brass knob */}
      <mesh geometry={boxGeo(w * 0.42, 0.08, 0.01)} material={m.walnut} position={[0, h - 0.1, d / 2 - 0.035]} />
      <mesh material={m.brass} position={[0, h - 0.1, d / 2 - 0.025]}>
        <sphereGeometry args={[0.012, 8, 6]} />
      </mesh>
    </group>
  );
}

/**
 * The inside of a room's front wall is the back of the hall's wall (which wears the corridor's paper):
 * a thin lining in the room's own paper, with the doorway left open.
 */
function FrontLining({ x0, x1, doorX, wall }: { x0: number; x1: number; doorX: number; wall: THREE.Material }) {
  return (
    <group position={[0, Y, 0]}>
      <Wall axis="x" from={x0} to={x1} at={UPSTAIRS.records.zN - 0.006} thickness={0.01} height={UPSTAIRS.height} openings={[{ c: doorX, w: UPSTAIRS.doorWidth, b: 0, t: UPSTAIRS.doorHeight }]} matPos={wall} matNeg={wall} />
    </group>
  );
}

// ------------------------------------------------------------------ the Guest Records room

function LedgerStand() {
  const m = mats();
  const pages = useMemo(() => {
    const t = ledgerTexture();
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffe2b0'), emissiveIntensity: 0.05, roughness: 0.92 });
  }, []);
  // The Blender stand's pages use glTF texture coordinates (the image the other way up).
  const glbPages = useMemo(() => {
    const t = (pages.map as THREE.CanvasTexture).clone();
    t.flipY = false;
    t.needsUpdate = true;
    return Object.assign(pages.clone(), { map: t, emissiveMap: t });
  }, [pages]);
  const model = useModel('ledger_stand', { walnut: m.walnut, leather: m.leather, pages: glbPages });
  useFrame(() => {
    // While the guest book is the next step, its pages glow a little in the candlelight.
    pages.emissiveIntensity = glbPages.emissiveIntensity = stage() === 'records' ? 0.22 + 0.12 * Math.sin(world.t * 2.2) : 0.06;
  });
  const top = 1.08;
  if (model)
    return (
      <group position={[RECORDS.ledger.x, Y, RECORDS.ledger.z]}>
        <Interactive id="records-ledger" maxDist={2.6} label={() => (game().found[LD.ledger] ? 'Read the guest book again' : 'Read the guest book')} onUse={openLedger}>
          <primitive object={model} />
        </Interactive>
      </group>
    );
  return (
    <group position={[RECORDS.ledger.x, Y, RECORDS.ledger.z]}>
      {/* Cross feet, a turned column, and a sloping desk facing the door */}
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} geometry={boxGeo(0.56, 0.05, 0.08)} material={m.walnut} position={[0, 0.025, 0]} rotation={[0, r, 0]} castShadow />
      ))}
      <mesh material={m.walnut} position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.055, 0.95, 10]} />
      </mesh>
      <group position={[0, top, 0]} rotation={[-0.42, 0, 0]}>
        <mesh geometry={boxGeo(0.6, 0.03, 0.44)} material={m.walnut} castShadow receiveShadow />
        <mesh geometry={boxGeo(0.6, 0.04, 0.02)} material={m.walnut} position={[0, 0.03, 0.22]} />
        <Interactive id="records-ledger" maxDist={2.6} label={() => (game().found[LD.ledger] ? 'Read the guest book again' : 'Read the guest book')} onUse={openLedger}>
          {/* The book: a leather cover, and the open pages */}
          <mesh geometry={boxGeo(0.56, 0.02, 0.4)} material={m.leather} position={[0, 0.026, 0]} />
          <mesh material={pages} position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.54, 0.34]} />
          </mesh>
        </Interactive>
      </group>
    </group>
  );
}

/** The Lady's key on its green ribbon, fallen on the floor in front of the stand. */
function FallenKey() {
  const m = mats();
  const show = useGame((s) => !!s.found[LD.ledger] && !s.found[LD.key]);
  const g = useRef<THREE.Group>(null!);
  const ribbon = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f5a34', roughness: 0.6, emissive: new THREE.Color('#0c2a16'), emissiveIntensity: 0.6 }), []);
  useFrame(() => {
    // It lands a moment after the draught (it is already there in a game carried on later).
    if (g.current) g.current.visible = world.t > ldFx.draughtAt + 2.6;
  });
  if (!show) return null;
  return (
    <group ref={g} position={[RECORDS.ledger.x - 0.1, Y + 0.012, RECORDS.ledger.z + 0.55]} rotation={[0, 0.7, 0]}>
      <Interactive id="records-key" maxDist={2.4} label={() => 'Take the small key'} onUse={takeKey}>
        <mesh material={m.brass} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.022, 0.006, 6, 16]} />
        </mesh>
        <mesh geometry={boxGeo(0.09, 0.008, 0.01)} material={m.brass} position={[0.065, 0, 0]} />
        <mesh geometry={boxGeo(0.012, 0.008, 0.026)} material={m.brass} position={[0.1, 0, 0.014]} />
        <mesh geometry={boxGeo(0.12, 0.003, 0.02)} material={ribbon} position={[-0.06, 0.004, 0.02]} rotation={[0, 0.5, 0]} />
        {/* A larger, invisible target so the key is easy to pick up */}
        <mesh position={[0.02, 0.05, 0]} visible={false}>
          <boxGeometry args={[0.3, 0.1, 0.3]} />
        </mesh>
      </Interactive>
    </group>
  );
}

const COAT_COLOURS = ['#1d1f24', '#2a2220', '#1a2420', '#30251c', '#24222a', '#1c1c1c', '#3a2a22', '#22201c', '#7a1c18'];

/** Nine coats on their hooks along the east wall. A draught sets them swaying. */
function CoatHooks() {
  const m = mats();
  const coatMats = useMemo(() => COAT_COLOURS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })), []);
  const coatGeo = useMemo(() => {
    // A hanging coat: narrow at the shoulders, wider at the hem, slightly flattened against the wall.
    const g = new THREE.CylinderGeometry(0.11, 0.2, 1.0, 10, 1, true);
    g.scale(1, 1, 0.55);
    return g;
  }, []);
  const coats = useRef<THREE.Group[]>([]);
  useFrame(() => {
    const t = world.t - ldFx.draughtAt;
    const k = t > 0 && t < 7 ? Math.exp(-t * 0.6) : 0;
    coats.current.forEach((c, i) => {
      if (!c) return;
      c.rotation.z = Math.sin(world.t * (2.6 + i * 0.13) + i) * 0.14 * k;
      c.rotation.x = Math.sin(world.t * 2.1 + i * 1.7) * 0.06 * k;
    });
  });
  const x = RECORDS.x1;
  const zs = Array.from({ length: 9 }, (_, i) => RECORDS.hooks.z + 1.12 - i * 0.28);
  return (
    <group>
      <Interactive
        id="records-coats"
        maxDist={2.6}
        label={() => 'Look at the coats'}
        onUse={() => showCaption('Nine coats, still on their hooks: eight dark ones, and a child’s red cloak. Nobody came back for them.')}
      >
        {/* The rail */}
        <mesh geometry={boxGeo(0.04, 0.12, 2.7)} material={m.walnut} position={[x - 0.02, Y + 1.82, RECORDS.hooks.z]} castShadow />
        {zs.map((z, i) => (
          <group key={z}>
            <mesh material={m.brass} position={[x - 0.07, Y + 1.8, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
            </mesh>
            {/* Each coat hangs from its hook and sways about it */}
            <group ref={(el) => void (coats.current[i] = el!)} position={[x - 0.14, Y + 1.78, z]}>
              <mesh geometry={coatGeo} material={coatMats[i]} position={[0, i === 8 ? -0.35 : -0.5, 0]} scale={i === 8 ? [0.75, 0.7, 0.75] : [1, 1 + (i % 3) * 0.08, 1]} rotation={[0, Math.PI / 2, 0]} castShadow />
              {/* Collars */}
              <mesh material={coatMats[i]} position={[0, -0.02, 0]} scale={[0.6, 0.35, 1]}>
                <sphereGeometry args={[0.11, 8, 6]} />
              </mesh>
            </group>
          </group>
        ))}
        {/* A top hat on the end hook */}
        <group position={[x - 0.16, Y + 1.98, RECORDS.hooks.z - 1.3]}>
          <mesh material={m.blackPaint}>
            <cylinderGeometry args={[0.085, 0.08, 0.17, 14]} />
          </mesh>
          <mesh material={m.blackPaint} position={[0, -0.085, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.01, 18]} />
          </mesh>
        </group>
      </Interactive>
    </group>
  );
}

/** The five portraits nobody hung, leaning against the wall under dust sheets. The sheets stir in the draught. */
function CoveredPortraits() {
  const m = mats();
  const sheets = useRef<THREE.Mesh[]>([]);
  const sheetGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 6, 8);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      // Draped folds that hang out at the bottom
      p.setZ(i, 0.03 * Math.sin(x * 14 + y * 3) + (0.5 - y) * 0.08);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(() => {
    const t = world.t - ldFx.draughtAt;
    const k = t > 0 && t < 6 ? Math.exp(-t * 0.7) : 0;
    sheets.current.forEach((s, i) => s && (s.rotation.x = -0.12 + Math.sin(world.t * 3 + i) * 0.05 * k));
  });
  const items = [
    { x: -0.85, w: 0.7, h: 0.95 },
    { x: -0.25, w: 0.62, h: 0.82 },
    { x: 0.3, w: 0.8, h: 1.05 },
    { x: 0.8, w: 0.55, h: 0.75 },
    { x: 1.1, w: 0.6, h: 0.86 },
  ];
  // Old dust sheets: the house's linen, greyed and yellowed with years of dust, and dull.
  const dust = useMemo(() => {
    const d = (m.linen as THREE.MeshStandardMaterial).clone();
    d.color.multiply(new THREE.Color(0.46, 0.43, 0.37));
    d.roughness = 1;
    return d;
  }, [m.linen]);
  // The canvas the slipped sheet uncovers: an old, darkened, varnished painting (not a black hole).
  const canvas = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1f16', roughness: 0.38, metalness: 0 }), []);
  const model = useModel('covered_portraits', { gilt: m.gilt, linen: dust, canvas });
  return (
    <group position={[RECORDS.covered.x, Y, RECORDS.zS + (model ? 0.3 : 0.2)]}>
      <Interactive
        id="records-covered"
        maxDist={2.6}
        label={() => 'Lift a dust sheet'}
        onUse={() => {
          audio.gust();
          showCaption('Under the sheet: a gilt frame, and a face painted by lamplight that you do not know. You let the sheet fall back.');
        }}
      >
        {model && <primitive object={model} />}
        {!model && items.map((it, i) => (
          <group key={i} position={[it.x, 0, -0.04 * (i % 2)]} rotation={[-0.14, 0, 0]}>
            <mesh geometry={boxGeo(it.w, it.h, 0.05)} material={m.gilt} position={[0, it.h / 2, 0]} castShadow />
            <mesh ref={(el) => void (sheets.current[i] = el!)} geometry={sheetGeo} material={m.linen} position={[0, it.h / 2 + 0.02, 0.05]} scale={[it.w + 0.12, it.h + 0.12, 1]} castShadow />
          </group>
        ))}
      </Interactive>
    </group>
  );
}

function RecordsDesk() {
  const m = mats();
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9ccab', roughness: 0.95 }), []);
  return (
    <group position={[RECORDS.desk.x + 0.02, Y, RECORDS.desk.z]} rotation={[0, Math.PI / 2, 0]}>
      <Desk w={1.25} d={0.62} />
      <Interactive
        id="records-papers"
        maxDist={2.4}
        label={() => 'Read the papers on the desk'}
        onUse={() => {
          audio.page([RECORDS.desk.x, Y + 0.9, RECORDS.desk.z]);
          useGame.getState().setNote({
            kicker: 'Papers on the desk',
            title: 'Bills from the night of the ball',
            body: [
              'To the band: for playing at the winter ball, from eight o’clock until midnight. (Not paid. Nobody came to pay it.)',
              'To Holloway & Sons, artists’ colourmen: nine canvases, a box of oil colours and a bottle of varnish, delivered on the morning of 21st December, for the Lady’s own use.',
              'A note, in a hurry: “Cancel the carriages for the morning. Nobody will be leaving.”',
            ],
            ask: 'Who do you think wrote the last note? What did they mean?',
          });
        }}
      >
        {[-0.3, 0.05, 0.32].map((x, i) => (
          <mesh key={x} geometry={boxGeo(0.21, 0.004, 0.29)} material={paper} position={[x, 0.762 + i * 0.002, 0.04]} rotation={[0, (i - 1) * 0.25, 0]} />
        ))}
      </Interactive>
      {/* An inkwell and a candle */}
      <mesh material={m.blackPaint} position={[-0.48, 0.79, -0.12]}>
        <cylinderGeometry args={[0.035, 0.04, 0.05, 10]} />
      </mesh>
      <Candle position={[0.5, 0.76, -0.15]} seed={3} />
    </group>
  );
}

export function RecordsRoom() {
  const m = mats();
  const R = RECORDS;
  return (
    <group>
      <group position={[0, Y, 0]}>
        <RoomShell
          x0={R.x0}
          x1={R.x1}
          zN={R.zN}
          zS={R.zS}
          height={UPSTAIRS.height}
          wall={m.wallStudy}
          floor={m.floorHall}
          own={['S', 'E', 'W']}
          doors={[{ side: 'N', at: R.doorX, width: UPSTAIRS.doorWidth }]}
          windows={[{ side: 'S', at: 2.05, width: 0.85, sill: 1.0, top: 2.45 }]}
          rail={2.45}
        />
      </group>
      <FrontLining x0={R.x0} x1={R.x1} doorX={R.doorX} wall={m.wallStudy} />
      <Rug position={[R.ledger.x - 0.1, Y, R.ledger.z + 0.2]} w={2.2} d={2.8} material={m.rugMirror} />
      <LedgerStand />
      <FallenKey />
      <CoatHooks />
      <CoveredPortraits />
      <RecordsDesk />
    </group>
  );
}

// ------------------------------------------------------------------ the Lady's room

function MusicBoxSmall() {
  const m = mats();
  return (
    <group>
      <mesh geometry={boxGeo(0.2, 0.08, 0.13)} material={m.walnut} position={[0, 0.04, 0]} castShadow />
      {/* The lid, standing open, with a little mirror inside it */}
      <group position={[0, 0.08, -0.065]} rotation={[-1.9, 0, 0]}>
        <mesh geometry={boxGeo(0.2, 0.012, 0.13)} material={m.walnut} position={[0, 0, 0.065]} />
      </group>
      <mesh material={m.brass} position={[0, 0.07, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.13, 12]} />
      </mesh>
      <mesh geometry={boxGeo(0.12, 0.004, 0.04)} material={m.brass} position={[0, 0.075, -0.03]} />
    </group>
  );
}

/** The Blender music box once it has loaded; the code-built one until then. */
function MusicBoxModel() {
  const m = mats();
  const model = useModel('music_box', { walnut: m.walnut, brass: m.brass, velvet: m.velvetOx });
  return model ? <primitive object={model} /> : <MusicBoxSmall />;
}

function Vanity() {
  const m = mats();
  const V = BOUDOIR.vanity;
  const mirror = BOUDOIR.mirror;
  const inBoudoir = () => game().zone === 'boudoir';
  const model = useModel('vanity', { mahogany: m.mahogany, gilt: m.gilt, brass: m.brass });
  return (
    <group>
      <group position={[V.x, Y, V.z]}>
        {model ? (
          <primitive object={model} />
        ) : (
          <>
            <Desk w={1.25} d={0.5} h={0.74} />
            {/* Drawers either side */}
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={boxGeo(0.3, 0.32, 0.46)} material={m.mahogany} position={[s * 0.44, 0.48, 0]} castShadow />
            ))}
            {/* The mirror's frame, standing on the back of the vanity */}
            <mesh geometry={boxGeo(mirror.w + 0.14, mirror.h + 0.14, 0.05)} material={m.gilt} position={[0, mirror.y, -0.25 + 0.005]} castShadow />
            <mesh geometry={boxGeo(0.06, mirror.y - 0.74 - mirror.h / 2 + 0.05, 0.04)} material={m.mahogany} position={[-(mirror.w / 2 + 0.03), 0.74 + (mirror.y - 0.74 - mirror.h / 2) / 2, -0.24]} />
            <mesh geometry={boxGeo(0.06, mirror.y - 0.74 - mirror.h / 2 + 0.05, 0.04)} material={m.mahogany} position={[mirror.w / 2 + 0.03, 0.74 + (mirror.y - 0.74 - mirror.h / 2) / 2, -0.24]} />
          </>
        )}
        {/* Bottles, a brush, the music box and a candle on the top */}
        {[-0.42, -0.34].map((x, i) => (
          <mesh key={x} material={m.glass} position={[x, 0.8 + i * 0.01, 0.08]}>
            <cylinderGeometry args={[0.025, 0.03, 0.1 + i * 0.03, 10]} />
          </mesh>
        ))}
        <mesh geometry={boxGeo(0.06, 0.03, 0.18)} material={m.silver} position={[-0.15, 0.755, 0.1]} rotation={[0, 0.3, 0]} />
        <group position={[0.27, 0.74, 0.09]} rotation={[0, -0.25, 0]}>
          <Interactive id="boudoir-musicbox" maxDist={2.4} label={() => 'Look at the music box'} onUse={() => showCaption('A little music box of walnut and brass. Its key has been wound tight, though nobody has touched it for years.')}>
            <MusicBoxModel />
          </Interactive>
        </group>
        <Candle position={[-0.52, 0.74, -0.12]} seed={7} />
      </group>
      {/* The glass reflects the room (the reflection is drawn only while you are in her room). */}
      <ReflectionPlane point={MIRROR_CENTRE} normal={[0, 0, 1]} active={inBoudoir} layers={MIRROR_LAYERS} boost={() => ldFx.scareRunning || world.t < ldFx.lady.start + ldFx.lady.dur}>
        <group position={MIRROR_CENTRE}>
          <Interactive
            id="boudoir-mirror"
            maxDist={2.8}
            label={() => (ldFx.scareRunning ? null : game().found[LD.scare] ? 'Look into the mirror again' : 'Look into the mirror')}
            onUse={lookInMirror}
          >
            <MirrorGlass w={mirror.w} h={mirror.h} fx={ldFx.mirror} seed={5} />
          </Interactive>
        </group>
      </ReflectionPlane>
    </group>
  );
}

/** The Lady, standing just behind you: drawn only in the mirror (her layer is one only the mirror's camera sees). */
export function MirrorLady() {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: hauntTexture('apparition'), transparent: true, opacity: 0, depthWrite: false, color: '#b9c4b6', fog: false }), []);
  const H = 1.7;
  const W = (H * HAUNT_IMAGES.apparition.w) / HAUNT_IMAGES.apparition.h;
  useEffect(() => void mesh.current.layers.set(MIRROR_ONLY_LAYER), []);
  useFrame(() => {
    const l = ldFx.lady;
    const t = world.t - l.start;
    const on = t >= 0 && t <= l.dur;
    mesh.current.visible = on;
    if (!on) return;
    // In fast (slowly in Gentle), hold, then gone in a breath.
    const fadeIn = l.lean ? 0.12 : 1.2;
    const k = Math.min(1, t / fadeIn) * Math.min(1, (l.dur - t) / 0.25);
    mat.opacity = l.opacity * k;
    // She leans a little closer while she is there.
    const lean = l.lean * Math.min(1, t / 1.6) * 0.2;
    mesh.current.position.set(LADY_BEHIND[0] - lean * 0.3, Y + H / 2 + 0.02, LADY_BEHIND[2] - lean);
  });
  return (
    <mesh ref={mesh} material={mat} rotation={[0, Math.PI, 0]} renderOrder={6} visible={false}>
      <planeGeometry args={[W, H]} />
    </mesh>
  );
}

function LadyDesk() {
  const m = mats();
  const letterShown = useGame((s) => !!s.found[LD.scare]);
  const seal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f5a34', roughness: 0.4, emissive: new THREE.Color('#0d3a1c'), emissiveIntensity: 0.5 }), []);
  const letter = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e2d6b8', roughness: 0.9, emissive: new THREE.Color('#ffe0b0'), emissiveIntensity: 0 }), []);
  useFrame(() => {
    letter.emissiveIntensity = stage() === 'message' ? 0.3 + 0.15 * Math.sin(world.t * 2.4) : 0.04;
  });
  return (
    <group position={[BOUDOIR.desk.x, Y, BOUDOIR.desk.z]} rotation={[0, -Math.PI / 2, 0]}>
      <Desk w={1.15} d={0.55} />
      <Candle position={[0.42, 0.76, -0.12]} seed={11} />
      <mesh material={m.blackPaint} position={[-0.42, 0.79, -0.12]}>
        <cylinderGeometry args={[0.035, 0.04, 0.05, 10]} />
      </mesh>
      <Interactive
        id="boudoir-desk"
        maxDist={2.4}
        label={() => (game().found[LD.scare] ? 'Read the letter on her desk' : 'Look at her desk')}
        onUse={() => {
          if (game().found[LD.scare]) openLetter();
          else showCaption('Her pen lies beside a blank sheet of paper, as if she had been about to write something.');
        }}
      >
        <mesh geometry={boxGeo(0.24, 0.004, 0.32)} material={letter} position={[0, 0.762, 0.05]} rotation={[0, 0.12, 0]} />
        {letterShown && (
          <mesh material={seal} position={[0.02, 0.768, 0.08]}>
            <cylinderGeometry args={[0.022, 0.022, 0.006, 14]} />
          </mesh>
        )}
      </Interactive>
    </group>
  );
}

/** The empty frame beside her door. At the very end, someone is standing in it. */
function EmptyFrame() {
  const m = mats();
  const fig = useMemo(() => new THREE.MeshBasicMaterial({ map: silhouetteTexture(), transparent: true, opacity: 0, color: '#c8d0c8' }), []);
  const back = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0c0a', roughness: 1 }), []);
  useFrame(() => {
    ldFx.frameFigure += (ldFx.frameFigureTarget - ldFx.frameFigure) * (1 - Math.exp(-world.dt * 0.9));
    fig.opacity = ldFx.frameFigure;
  });
  const w = 0.62;
  const h = 0.8;
  return (
    <group position={[BOUDOIR.frame.x, Y + BOUDOIR.frame.y, BOUDOIR.zN - 0.02]} rotation={[0, Math.PI, 0]}>
      <Interactive
        id="boudoir-frame"
        maxDist={2.6}
        label={() => 'Look at the empty frame'}
        onUse={() =>
          showCaption(
            game().found[LD.twist]
              ? 'Someone is standing in the frame now. You cannot see their face. The brass plate under it is still blank, waiting for a name.'
              : 'An empty frame, with nothing in it but darkness. The brass plate under it is blank.',
          )
        }
      >
        <mesh geometry={boxGeo(w + 0.16, h + 0.16, 0.05)} material={m.gilt} position={[0, 0, -0.01]} castShadow />
        <mesh material={back} position={[0, 0, 0.017]}>
          <planeGeometry args={[w, h]} />
        </mesh>
        <mesh material={fig} position={[0, 0, 0.019]}>
          <planeGeometry args={[w, h]} />
        </mesh>
        {/* The blank brass plate */}
        <mesh geometry={boxGeo(0.18, 0.05, 0.008)} material={m.brass} position={[0, -h / 2 - 0.13, 0.0]} />
      </Interactive>
    </group>
  );
}

export function LadyRoom() {
  const m = mats();
  const B = BOUDOIR;
  return (
    <group>
      <group position={[0, Y, 0]}>
        <RoomShell
          x0={B.x0}
          x1={B.x1}
          zN={B.zN}
          zS={B.zS}
          height={UPSTAIRS.height}
          wall={m.wallNursery}
          floor={m.floorHall}
          own={['S', 'E', 'W']}
          doors={[{ side: 'N', at: B.doorX, width: UPSTAIRS.doorWidth }]}
          windows={[{ side: 'W', at: B.window.z, width: 1.0, sill: 0.95, top: 2.5 }]}
          rail={2.45}
        />
      </group>
      <FrontLining x0={B.x0} x1={B.x1} doorX={B.doorX} wall={m.wallNursery} />
      <Rug position={[-3.4, Y, -13.3]} w={2.6} d={3.2} material={m.rugHall} />
      <Vanity />
      <group position={[B.gown.x, Y, B.gown.z]} rotation={[0, 0.7, 0]}>
        <Interactive
          id="boudoir-gown"
          maxDist={2.6}
          label={() => 'Look at the green gown'}
          onUse={() => showCaption('A green silk ball gown, made for the winter ball. Its hem is still grey with dust from the dance floor.')}
        >
          <DressForm color={m.velvetGreen} trim={m.gilt} />
        </Interactive>
      </group>
      <Chaise position={[B.chaise.x, Y, B.chaise.z]} rotationY={Math.PI / 2} />
      <LadyDesk />
      <EmptyFrame />
    </group>
  );
}

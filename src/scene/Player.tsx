/**
 * First-person controller + camera director.
 * Three camera modes, in priority order:
 *   1. Cinematic path (intro, guided walks) — skippable.
 *   2. Lesson shot — a fixed, framed view so the teacher never has to aim.
 *   3. Free first-person — WASD + mouse, collision, head bob, footsteps.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame } from '../state/store';
import { TEST_BUILD } from '../systems/testBuild';
import { resolveCircle } from '../world/collision';
import { EYE_HEIGHT, groundAt, POSES, SHOTS, surfaceAt, zoneAt } from '../world/layout';
import { audio } from '../systems/audio';
import { getInteractable, pickInteractable } from '../systems/interaction';
import { liveCamera, world } from '../systems/time';
import { canInteract } from './Interactive';

const WALK = 2.0;
const RUN = 3.4;
const SENS = 0.0021;

const keys = new Set<string>();
const isTyping = () => {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
};

/** Automated tests run on a software renderer at a few frames per second; let them use a fixed large step. */
const TEST_DT = (TEST_BUILD && Number(new URLSearchParams(location.search).get('testdt'))) || 0;

const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function Player() {
  const { camera, gl } = useThree();
  const pos = useRef(new THREE.Vector3(...POSES.hallStart.position));
  const yaw = useRef(POSES.hallStart.yaw);
  const pitch = useRef(POSES.hallStart.pitch);
  const vel = useRef(new THREE.Vector2());
  const bob = useRef(0);
  const groundY = useRef(0);
  const lastStepPhase = useRef(0);
  const cineT = useRef(0);
  const cineId = useRef<string | null>(null);
  const cineFired = useRef(new Set<number>());
  const lookTarget = useRef(new THREE.Vector3());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const curves = useRef<{ path: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3 } | null>(null);
  const wasShot = useRef(false);
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);

  // --- Input --------------------------------------------------------------
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      keys.add(e.code);
      if (e.code === 'KeyE' && !e.repeat) tryInteract();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement === el) {
        yaw.current -= e.movementX * SENS;
        pitch.current -= e.movementY * SENS;
      } else if (drag.current) {
        drag.current.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
        if (!game().shot && !game().cinematic) {
          yaw.current -= e.movementX * SENS * 1.4;
          pitch.current -= e.movementY * SENS * 1.4;
        }
      }
      pitch.current = THREE.MathUtils.clamp(pitch.current, -1.3, 1.3);
    };
    const mdown = (e: MouseEvent) => {
      if (e.target !== el) return;
      drag.current = { x: e.clientX, y: e.clientY, moved: 0 };
    };
    const mup = (e: MouseEvent) => {
      const d = drag.current;
      drag.current = null;
      if (e.target !== el || !d) return;
      const s = game();
      if (document.pointerLockElement === el) {
        if (e.button === 0) tryInteract();
        return;
      }
      // A simple click (no drag) on empty space captures the mouse for free look.
      if (d.moved < 6 && s.phase === 'play' && !s.shot && !s.shotPose && !s.cinematic && !s.hover && !s.teacherOpen) {
        void el.requestPointerLock?.();
      }
    };
    const lockChange = () => {
      const locked = document.pointerLockElement === el;
      useGame.getState().setPointerLocked(locked);
      if (!locked) keys.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', mdown);
    window.addEventListener('mouseup', mup);
    document.addEventListener('pointerlockchange', lockChange);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', mdown);
      window.removeEventListener('mouseup', mup);
      document.removeEventListener('pointerlockchange', lockChange);
    };
  }, [gl]);

  function tryInteract() {
    if (game().inspecting) {
      useGame.getState().setInspecting(null);
      return;
    }
    if (!canInteract() || game().shot) return;
    const h = game().hover;
    if (!h) return;
    getInteractable(h.id)?.onUse();
  }

  // Teleports
  const teleport = useGame((s) => s.teleport);
  useEffect(() => {
    if (!teleport) return;
    // A teleport always wins over handing the lesson camera back to first-person.
    wasShot.current = false;
    pos.current.set(...teleport.pose.position);
    yaw.current = teleport.pose.yaw;
    pitch.current = teleport.pose.pitch;
    vel.current.set(0, 0);
  }, [teleport]);

  // --- Frame --------------------------------------------------------------
  useFrame((_, rawDt) => {
    const s = game();
    const dt = TEST_DT || Math.min(rawDt, 0.05);
    world.dt = s.paused ? 0 : dt;
    world.t += world.dt;
    if (s.paused) return;

    if (s.phase === 'loading' || s.phase === 'title') {
      // Slow, drifting establishing shot of the house.
      const t = world.t;
      camera.position.set(Math.sin(t * 0.05) * 2.6, 1.6 + Math.sin(t * 0.07) * 0.15, 25.5 - Math.sin(t * 0.04) * 1.2);
      lookTarget.current.set(0, 1.9, -2);
      camera.lookAt(lookTarget.current);
      afterCamera(s.zone);
      return;
    }

    const cine = s.cinematic;
    if (cine) {
      if (cineId.current !== cine.id) {
        cineId.current = cine.id;
        cineT.current = 0;
        cineFired.current.clear();
        curves.current = {
          path: new THREE.CatmullRomCurve3(cine.points.map((p) => new THREE.Vector3(...p)), false, 'centripetal'),
          look: new THREE.CatmullRomCurve3(
            (cine.targets.length > 1 ? cine.targets : [cine.targets[0], cine.targets[0]]).map((p) => new THREE.Vector3(...p)),
            false,
            'centripetal',
          ),
        };
      }
      cineT.current = Math.min(1, cineT.current + dt / cine.duration);
      const t = ease(cineT.current);
      const c = curves.current!;
      camera.position.copy(c.path.getPoint(t));
      // Gentle handheld sway keeps cinematic moves from feeling mechanical.
      camera.position.y += Math.sin(world.t * 1.7) * 0.006;
      lookTarget.current.copy(c.look.getPoint(t));
      camera.lookAt(lookTarget.current);
      cine.events?.forEach((ev, i) => {
        if (cineT.current >= ev.t && !cineFired.current.has(i)) {
          cineFired.current.add(i);
          ev.run();
        }
      });
      if (cineT.current >= 1) finishCinematic();
      afterCamera(s.zone);
      return;
    }
    cineId.current = null;

    if (s.shot || s.shotPose) {
      const shot = s.shotPose ?? SHOTS[s.shot!];
      const k = 1 - Math.exp(-dt * 2.4);
      const target = new THREE.Vector3(...shot.position);
      // Slow breathing drift so the frame feels alive
      target.x += Math.sin(world.t * 0.31) * 0.03;
      target.y += Math.sin(world.t * 0.47) * 0.015;
      camera.position.lerp(target, k);
      lookTarget.current.lerp(new THREE.Vector3(...shot.target), k);
      camera.lookAt(lookTarget.current);
      wasShot.current = true;
      afterCamera(s.zone);
      if (s.hover) useGame.getState().setHover(null);
      return;
    }
    if (wasShot.current) {
      // Leaving a lesson shot: hand the current view back to first-person.
      wasShot.current = false;
      adoptCamera();
    }

    // Free first-person
    const locked = document.pointerLockElement === gl.domElement;
    if (keys.has('ArrowLeft')) yaw.current += dt * 1.6;
    if (keys.has('ArrowRight')) yaw.current -= dt * 1.6;
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const r = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const canMove = s.phase === 'play' && !s.teacherOpen && !s.helpOpen;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK;
    const sy = Math.sin(yaw.current);
    const cy = Math.cos(yaw.current);
    let wx = 0;
    let wz = 0;
    if (canMove) {
      wx = -sy * f + cy * r;
      wz = -cy * f - sy * r;
      const len = Math.hypot(wx, wz);
      if (len > 1) {
        wx /= len;
        wz /= len;
      }
    }
    const accel = 1 - Math.exp(-dt * 9);
    vel.current.x += (wx * speed - vel.current.x) * accel;
    vel.current.y += (wz * speed - vel.current.y) * accel;
    const nx = pos.current.x + vel.current.x * dt;
    const nz = pos.current.z + vel.current.y * dt;
    const [rx, rz] = resolveCircle(nx, nz);
    pos.current.x = rx;
    pos.current.z = rz;
    const moving = Math.hypot(vel.current.x, vel.current.y);
    bob.current += moving * dt * 2.9;
    const bobAmt = Math.min(1, moving / WALK);
    groundY.current += (groundAt(pos.current.x, pos.current.z) - groundY.current) * (1 - Math.exp(-dt * 10));
    camera.position.set(pos.current.x, groundY.current + EYE_HEIGHT + Math.sin(bob.current * 2) * 0.022 * bobAmt, pos.current.z);
    camera.rotation.set(pitch.current, yaw.current, Math.sin(bob.current) * 0.003 * bobAmt, 'YXZ');
    const stepPhase = Math.floor(bob.current / Math.PI);
    if (stepPhase !== lastStepPhase.current) {
      lastStepPhase.current = stepPhase;
      // Footfalls are tied to distance walked, so they stop the moment you stop.
      if (moving > 0.6) audio.footstep(Math.min(1.3, moving / WALK), surfaceAt(pos.current.x, pos.current.z));
    }

    // Centre-ray interaction (pointer locked). When the pointer is free, hover comes from mouse events.
    if (locked && canInteract()) {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const it = pickInteractable(raycaster);
      const label = it?.label() ?? null;
      useGame.getState().setHover(it && label ? { id: it.id, label } : null);
    }
    afterCamera(s.zone);
  });

  function afterCamera(prevZone: string) {
    const z = zoneAt(camera.position.z, camera.position.x);
    if (z !== prevZone) {
      useGame.getState().setZone(z);
      audio.setZone(z);
    }
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    liveCamera.position = [camera.position.x, camera.position.y, camera.position.z];
    liveCamera.forward = [fwd.x, fwd.y, fwd.z];
    audio.setListener([camera.position.x, camera.position.y, camera.position.z], [fwd.x, fwd.y, fwd.z]);
  }

  function adoptCamera() {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    yaw.current = Math.atan2(-fwd.x, -fwd.z);
    pitch.current = THREE.MathUtils.clamp(Math.asin(fwd.y), -1.2, 1.2);
    const [x, z] = resolveCircle(camera.position.x, camera.position.z);
    pos.current.set(x, EYE_HEIGHT, z);
    groundY.current = groundAt(x, z);
    vel.current.set(0, 0);
  }

  function finishCinematic() {
    const c = game().cinematic;
    adoptCamera();
    // Fire any events that were skipped over.
    c?.events?.forEach((ev, i) => {
      if (!cineFired.current.has(i)) ev.run();
    });
    useGame.getState().endCinematic();
    c?.onDone?.();
  }

  // Skipping: jump the cinematic to its end.
  useEffect(() => {
    const onSkip = () => {
      if (game().cinematic) cineT.current = 1;
    };
    window.addEventListener('hosl:skip', onSkip);
    return () => window.removeEventListener('hosl:skip', onSkip);
  }, []);

  return null;
}

/** Ask the active cinematic to skip to its end. */
export function skipCinematic() {
  window.dispatchEvent(new Event('hosl:skip'));
}

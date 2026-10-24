import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';

export interface PortfolioSceneColors {
  primary: string;
  success: string;
  info: string;
  grid: string;
  text: string;
}

interface PortfolioSceneProps {
  colors: PortfolioSceneColors;
  /** Accessible description of what the scene shows. */
  label?: string;
}

const COLS = 9;
const ROWS = 5;
const BAR = 0.62;
const GAP = 0.34;

/**
 * Decorative 3D "portfolio landscape": a grid of bars that rise like a growing
 * portfolio, a glowing growth curve above them and slow-orbiting market points.
 *
 * - Pauses when off-screen or when the tab is hidden.
 * - Renders a single still frame when the user prefers reduced motion.
 * - Falls back to a static illustration when WebGL is unavailable.
 */
export function PortfolioScene({ colors, label = 'Animated 3D illustration of a growing portfolio' }: PortfolioSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 1.1, 0);

    const primary = new THREE.Color(colors.primary);
    const success = new THREE.Color(colors.success);
    const info = new THREE.Color(colors.info);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 9, 6);
    scene.add(key);
    const rim = new THREE.PointLight(info, 18, 20);
    rim.position.set(-5, 4, -4);
    scene.add(rim);

    // Floor grid
    const width = COLS * (BAR + GAP);
    const depth = ROWS * (BAR + GAP);
    const grid = new THREE.GridHelper(Math.max(width, depth) + 3, 16, colors.grid, colors.grid);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.45;
    scene.add(grid);

    // Bars (one instanced mesh, cheap to draw)
    const barGeo = new THREE.BoxGeometry(BAR, 1, BAR);
    barGeo.translate(0, 0.5, 0); // grow from the floor
    const barMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25, transparent: true, opacity: 0.92 });
    const count = COLS * ROWS;
    const bars = new THREE.InstancedMesh(barGeo, barMat, count);
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    const cells: { x: number; z: number; base: number; phase: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = (c - (COLS - 1) / 2) * (BAR + GAP);
        const z = (r - (ROWS - 1) / 2) * (BAR + GAP);
        // Upward trend left-to-right with some deterministic texture.
        const trend = 0.35 + (c / (COLS - 1)) * 1.9;
        const texture = 0.35 * Math.sin(c * 1.7 + r * 2.3) + 0.2 * Math.cos(r * 1.1);
        cells.push({ x, z, base: Math.max(0.2, trend + texture - r * 0.12), phase: c * 0.45 + r * 0.8 });
        const t = c / (COLS - 1);
        tmpColor.copy(primary).lerp(success, t * 0.85);
        bars.setColorAt(cells.length - 1, tmpColor);
      }
    }
    scene.add(bars);

    // Growth curve above the bars
    const curvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = (t - 0.5) * width;
      const y = 1.25 + t * 2.0 + 0.22 * Math.sin(t * 11);
      curvePoints.push(new THREE.Vector3(x, y, -depth / 2 - 0.3));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 160, 0.05, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: success });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tubeGeo.setDrawRange(0, 0);
    scene.add(tube);
    const tubeIndexCount = tubeGeo.index ? tubeGeo.index.count : 0;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 20, 20),
      new THREE.MeshBasicMaterial({ color: success }),
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 20, 20),
      new THREE.MeshBasicMaterial({ color: success, transparent: true, opacity: 0.18 }),
    );
    head.add(halo);
    scene.add(head);

    // Orbiting market points
    const orbitCount = 70;
    const orbitPos = new Float32Array(orbitCount * 3);
    const orbitSeeds = Array.from({ length: orbitCount }, (_, i) => ({
      radius: 3.6 + ((i * 37) % 23) / 10,
      speed: 0.08 + ((i * 13) % 7) / 60,
      height: 0.6 + ((i * 29) % 31) / 9,
      angle: (i / orbitCount) * Math.PI * 2,
    }));
    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(orbitPos, 3));
    const orbitMat = new THREE.PointsMaterial({ color: info, size: 0.07, transparent: true, opacity: 0.8 });
    const orbit = new THREE.Points(orbitGeo, orbitMat);
    scene.add(orbit);

    // Interaction: gentle parallax towards the pointer
    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    if (!reduceMotion) host.addEventListener('pointermove', onPointer);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Pull back on narrow screens so the whole landscape stays visible.
      const dist = w / h < 1 ? 17.5 : 14.5;
      camera.userData.dist = dist;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const update = (time: number) => {
      const t = time / 1000;
      // Bars rise in on load, then breathe.
      const intro = reduceMotion ? 1 : Math.min(1, t / 1.6);
      const easedIntro = 1 - Math.pow(1 - intro, 3);
      cells.forEach((cell, i) => {
        const wave = reduceMotion ? 0 : 0.18 * Math.sin(t * 1.2 + cell.phase);
        const delay = Math.min(1, Math.max(0, easedIntro * 1.6 - (cell.x + width / 2) / width * 0.6));
        dummy.position.set(cell.x, 0, cell.z);
        dummy.scale.set(1, Math.max(0.02, (cell.base + wave) * delay), 1);
        dummy.updateMatrix();
        bars.setMatrixAt(i, dummy.matrix);
      });
      bars.instanceMatrix.needsUpdate = true;

      // Draw the growth curve progressively, then loop.
      const cycle = reduceMotion ? 1 : ((t * 0.18) % 1.25) / 1.0;
      const drawn = Math.min(1, cycle);
      const triangles = Math.floor((tubeIndexCount / 3) * drawn) * 3;
      tubeGeo.setDrawRange(0, triangles);
      head.position.copy(curve.getPointAt(Math.max(0.001, drawn)));
      halo.scale.setScalar(reduceMotion ? 1 : 1 + 0.25 * Math.sin(t * 4));

      for (let i = 0; i < orbitCount; i++) {
        const s = orbitSeeds[i];
        const a = s.angle + (reduceMotion ? 0 : t * s.speed);
        orbitPos[i * 3] = Math.cos(a) * s.radius;
        orbitPos[i * 3 + 1] = s.height + (reduceMotion ? 0 : 0.15 * Math.sin(t + i));
        orbitPos[i * 3 + 2] = Math.sin(a) * s.radius * 0.7;
      }
      orbitGeo.attributes.position.needsUpdate = true;

      const dist = (camera.userData.dist as number) ?? 14.5;
      const yaw = (reduceMotion ? 0.55 : 0.55 + Math.sin(t * 0.12) * 0.25) + pointer.x * 0.18;
      const pitch = 0.42 - pointer.y * 0.06;
      camera.position.set(
        Math.sin(yaw) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist + 1,
        Math.cos(yaw) * Math.cos(pitch) * dist,
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
    };

    let frame = 0;
    let running = false;
    const start = performance.now();
    const loop = () => {
      update(performance.now() - start);
      frame = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running || reduceMotion) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    if (reduceMotion) update(10_000);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) play();
      else pause();
    });
    io.observe(host);
    const onVisibility = () => (document.hidden || !visible ? pause() : play());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('pointermove', onPointer);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [colors.primary, colors.success, colors.info, colors.grid, colors.text]);

  return (
    <Host ref={hostRef} role="img" aria-label={label}>
      {failed && <StaticFallback colors={colors} />}
    </Host>
  );
}

/** Shown when WebGL can't start: a flat version of the same idea. */
function StaticFallback({ colors }: { colors: PortfolioSceneColors }) {
  const heights = [28, 36, 33, 48, 44, 58, 66, 62, 80];
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" aria-hidden="true">
      {heights.map((h, i) => (
        <rect key={i} x={20 + i * 30} y={180 - h * 1.8} width={20} height={h * 1.8} rx={3}
          fill={i > 5 ? colors.success : colors.primary} opacity={0.35 + i * 0.07} />
      ))}
      <polyline fill="none" stroke={colors.success} strokeWidth={3} strokeLinecap="round"
        points={heights.map((h, i) => `${30 + i * 30},${160 - h * 1.9}`).join(' ')} />
    </svg>
  );
}

const Host = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  touch-action: pan-y;

  canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
`;

export default PortfolioScene;

// Malek's shop as a small 3D room (three.js through React Three Fiber). Loaded only when you step
// inside (React.lazy in MalekShop), so the rest of the game never downloads three.js.
//
// The supplied paintings are references, not models: the room is rebuilt from simple boxes and
// cylinders laid out like them (charcoal grill on the left wall, shelves and the preparation bench
// at the back, the storeroom doorway at the back right, tables on the right, the street door in the
// right wall), with small generated textures. Malek is the one cut-out, stood behind a counter so the
// counter hides him below the waist.
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MalekScene } from '../../game/systems/malek';
import { SCENE_SPOT } from '../../game/systems/malek';

import { INVALIDATE_EVENT, fovFor, type Hotspot, type Orbit } from './orbit';
export type { Hotspot, Orbit };

const TARGET = new THREE.Vector3(-0.15, 0.8, -0.5);
// room: 7 m wide (x), 6 m deep (z), walls 3.2 m; the open front faces +z (narrow enough for a phone)
const W = 7, D = 6, H = 3.2;

// ---------------- textures, drawn once ----------------
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const noise = (g: CanvasRenderingContext2D, w: number, h: number, n: number, rgb: string, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${rgb},${Math.random() * a})`; const s = 1 + Math.random() * 3; g.fillRect(Math.random() * w, Math.random() * h, s, s); }
};
function useTextures() {
  return useMemo(() => ({
    plaster: canvasTex(256, 256, (g) => {
      g.fillStyle = '#cdb38a'; g.fillRect(0, 0, 256, 256);
      noise(g, 256, 256, 2600, '120,90,55', 0.18); noise(g, 256, 256, 1400, '250,235,205', 0.2);
      for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(110,80,50,0.08)'; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 50, 12 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); }
    }, [2, 1]),
    floor: canvasTex(256, 256, (g) => {
      g.fillStyle = '#b89a6c'; g.fillRect(0, 0, 256, 256);
      const n = 4, s = 256 / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = Math.random() * 30 - 15;
        g.fillStyle = `rgb(${178 + v},${150 + v},${108 + v})`; g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      }
      noise(g, 256, 256, 2400, '90,65,40', 0.2);
      g.strokeStyle = 'rgba(80,58,36,0.55)'; g.lineWidth = 3;
      for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke(); }
    }, [5, 4]),
    wood: canvasTex(128, 256, (g) => {
      g.fillStyle = '#6b4526'; g.fillRect(0, 0, 128, 256);
      for (let x = 0; x < 128; x += 3) { g.fillStyle = `rgba(${40 + Math.random() * 40},${22 + Math.random() * 20},10,${0.25 + Math.random() * 0.3})`; g.fillRect(x, 0, 1 + Math.random() * 2, 256); }
      noise(g, 128, 256, 600, '30,15,5', 0.3);
    }, [1, 1]),
    cloth: canvasTex(64, 64, (g) => {
      g.fillStyle = '#8c3b22'; g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) { g.fillStyle = y % 16 ? 'rgba(230,190,120,0.5)' : 'rgba(40,20,10,0.35)'; g.fillRect(0, y, 64, 2); }
    }, [2, 3]),
  }), []);
}

/** the board on the wall: the menu, chalked in English with the Arabic beside it */
function menuTexture(lines: { en: string; ar: string; price: string }[]) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1f2420'; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = '#6b4526'; g.lineWidth = 18; g.strokeRect(0, 0, 512, 384);
  g.fillStyle = '#efe6cf'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.fillText('MALEK', 256, 48);
  g.font = '18px Georgia, serif';
  lines.slice(0, 9).forEach((l, i) => {
    const y = 84 + i * 32;
    g.textAlign = 'left'; g.fillText(l.en, 26, y);
    g.textAlign = 'right'; g.fillText(l.price, 488, y);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- pieces ----------------
type Tex = ReturnType<typeof useTextures>;
const brass = new THREE.MeshStandardMaterial({ color: '#b8893b', metalness: 0.6, roughness: 0.35 });
const clay = new THREE.MeshStandardMaterial({ color: '#a8592f', roughness: 0.9 });
const dark = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 1 });

function Table({ x, z, tex, onPick }: { x: number; z: number; tex: Tex; onPick?: () => void }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.wood, roughness: 0.85 }), [tex]);
  return (
    <group position={[x, 0, z]} onClick={onPick}>
      <mesh position={[0, 0.74, 0]} material={wood}><boxGeometry args={[1.1, 0.06, 0.8]} /></mesh>
      {[[-0.48, -0.33], [0.48, -0.33], [-0.48, 0.33], [0.48, 0.33]].map(([a, b], i) => (
        <mesh key={i} position={[a, 0.37, b]} material={wood}><boxGeometry args={[0.07, 0.74, 0.07]} /></mesh>
      ))}
      {[[-0.85, 0], [0.85, 0], [0, 0.7]].map(([a, b], i) => (
        <group key={`s${i}`} position={[a, 0, b]}>
          <mesh position={[0, 0.42, 0]} material={wood}><boxGeometry args={[0.38, 0.06, 0.38]} /></mesh>
          {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([c, d], j) => (
            <mesh key={j} position={[c, 0.2, d]} material={wood}><boxGeometry args={[0.05, 0.4, 0.05]} /></mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.25, 0.82, 0.05]} material={brass}><cylinderGeometry args={[0.05, 0.07, 0.12, 10]} /></mesh>
    </group>
  );
}

function Grill({ cold, tex }: { cold: boolean; tex: Tex }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.wood, roughness: 0.9 }), [tex]);
  const coals = useMemo(() => new THREE.MeshStandardMaterial({ color: cold ? '#2b2522' : '#ff5a1f', emissive: cold ? '#000000' : '#ff3d00', emissiveIntensity: cold ? 0 : 1.4, roughness: 1 }), [cold]);
  return (
    <group position={[-2.65, 0, -0.6]}>
      {/* the brick-and-wood counter the brazier sits on */}
      <mesh position={[0, 0.45, 0]} material={wood}><boxGeometry args={[0.8, 0.9, 2.6]} /></mesh>
      <mesh position={[0, 0.98, -0.3]} material={dark}><boxGeometry args={[0.7, 0.16, 1.4]} /></mesh>
      <mesh position={[0, 1.065, -0.3]} material={coals}><boxGeometry args={[0.6, 0.02, 1.3]} /></mesh>
      {!cold && Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, 1.1, -0.85 + i * 0.18]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.75, 6]} />
          <meshStandardMaterial color="#6e2f17" roughness={0.8} />
        </mesh>
      ))}
      {/* bread basket and a brass tray at the near end */}
      <mesh position={[0, 0.98, 0.75]} material={brass}><cylinderGeometry args={[0.28, 0.24, 0.06, 18]} /></mesh>
      <mesh position={[0.05, 1.0, 1.1]}><cylinderGeometry args={[0.18, 0.14, 0.14, 12]} /><meshStandardMaterial color="#a77b45" roughness={1} /></mesh>
      {/* the smoke hood and chimney against the wall */}
      <mesh position={[-0.55, 2.35, -0.3]} material={dark}><boxGeometry args={[0.6, 0.5, 1.5]} /></mesh>
      <mesh position={[-0.7, 2.85, -0.3]} material={dark}><boxGeometry args={[0.3, 0.7, 0.45]} /></mesh>
      {!cold && <pointLight position={[0, 1.4, -0.3]} color="#ff7a30" intensity={2.2} distance={3.2} decay={2} />}
    </group>
  );
}

function Shelves({ tex }: { tex: Tex }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.wood, roughness: 0.85 }), [tex]);
  const items = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ row: i % 4, x: -0.75 + ((i * 0.37) % 1.5), kind: i % 3 })), []);
  return (
    <group position={[-1.0, 0, -2.8]}>
      {[0, 1.85].map((x, i) => <mesh key={i} position={[x - 0.92, 1.2, 0]} material={wood}><boxGeometry args={[0.07, 2.4, 0.38]} /></mesh>)}
      {[0.35, 0.85, 1.35, 1.85, 2.35].map((y) => <mesh key={y} position={[0, y, 0]} material={wood}><boxGeometry args={[1.9, 0.05, 0.38]} /></mesh>)}
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, 0.38 + it.row * 0.5 + (it.kind === 2 ? 0.16 : 0.1), 0.02]} material={it.kind === 0 ? brass : it.kind === 1 ? clay : brass}>
          {it.kind === 2 ? <cylinderGeometry args={[0.16, 0.16, 0.03, 18]} /> : <cylinderGeometry args={[0.07, 0.09, it.kind ? 0.22 : 0.16, 10]} />}
        </mesh>
      ))}
      {/* a big water jar beside the shelves */}
      <mesh position={[-1.35, 0.32, 0.2]} scale={[1, 1.25, 1]} material={clay}><sphereGeometry args={[0.26, 16, 12]} /></mesh>
    </group>
  );
}

function Bench({ tex }: { tex: Tex }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.wood, roughness: 0.85 }), [tex]);
  return (
    <group position={[1.05, 0, -2.35]}>
      <mesh position={[0, 0.88, 0]} material={wood}><boxGeometry args={[1.8, 0.08, 0.7]} /></mesh>
      <mesh position={[0, 0.44, 0]} material={wood}><boxGeometry args={[1.7, 0.8, 0.6]} /></mesh>
      <mesh position={[-0.35, 0.94, 0.05]}><boxGeometry args={[0.5, 0.04, 0.32]} /><meshStandardMaterial color="#b9895a" roughness={0.9} /></mesh>
      <mesh position={[-0.35, 0.98, 0.05]}><boxGeometry args={[0.3, 0.05, 0.18]} /><meshStandardMaterial color="#9a3b2a" roughness={0.8} /></mesh>
      <mesh position={[0.45, 0.96, 0]} material={brass}><cylinderGeometry args={[0.2, 0.16, 0.1, 16]} /></mesh>
    </group>
  );
}

function Lamp({ p, on }: { p: [number, number, number]; on: boolean }) {
  return (
    <group position={p}>
      <mesh material={brass}><cylinderGeometry args={[0.06, 0.08, 0.16, 10]} /></mesh>
      <mesh position={[0, 0.14, 0]}><sphereGeometry args={[0.06, 10, 8]} /><meshStandardMaterial color="#ffd38a" emissive="#ffb347" emissiveIntensity={on ? 2 : 0.2} /></mesh>
      {on && <pointLight position={[0, 0.25, 0]} color="#ffc070" intensity={3} distance={6} decay={1.6} />}
    </group>
  );
}

/** Malek: the painted cut-out, kept upright and turned to face the camera */
function MalekFigure({ spot, onPick }: { spot: 'grill' | 'bench' | 'table'; onPick: () => void }) {
  const tex = useLoader(THREE.TextureLoader, 'art/malek/malek-figure.webp');
  tex.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Group>(null);
  // the cut-out runs from the top of his head to the waist (0.85 m); the counter hides the cut
  const h = 0.92, w = h * (427 / 560);
  const at: Record<typeof spot, [number, number, number]> = { grill: [-3.17, 0.9 + h / 2, -0.75], bench: [1.0, 0.86 + h / 2, -2.82], table: [1.8, 0.66 + h / 2, -0.42] };
  useFrame(({ camera }) => {
    const g = ref.current; if (!g) return;
    g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
  });
  return (
    <group ref={ref} position={at[spot]}>
      <mesh onClick={(e) => { e.stopPropagation(); onPick(); }} name="malek">
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.08} roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** a wall that fades when it stands between the camera and the room (camera on its outer side) */
function Wall({ pos, rot, size, normal, mat }: { pos: [number, number, number]; rot: [number, number, number]; size: [number, number]; normal: THREE.Vector3; mat: THREE.MeshStandardMaterial }) {
  const m = useMemo(() => { const c = mat.clone(); c.transparent = true; return c; }, [mat]);
  const p = useMemo(() => new THREE.Vector3(...pos), [pos]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, invalidate }) => {
    const outside = tmp.copy(camera.position).sub(p).dot(normal) < 0;
    const want = outside ? 0.08 : 1;
    if (Math.abs(m.opacity - want) > 0.01) { m.opacity += (want - m.opacity) * 0.25; m.depthWrite = m.opacity > 0.9; invalidate(); }
  });
  return <mesh position={pos} rotation={rot} material={m} name="wall" raycast={() => null}><planeGeometry args={size} /></mesh>;
}

/** turns the orbit numbers into a camera position, easing towards them */
function CameraRig({ orbit, onFrame }: { orbit: MutableRefObject<Orbit>; onFrame: (cam: THREE.Camera, size: { width: number; height: number }) => void }) {
  const { camera, size, invalidate } = useThree();
  const cur = useRef<Orbit>({ ...orbit.current });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fovFor(size.width / Math.max(1, size.height)); cam.updateProjectionMatrix(); invalidate();
  }, [camera, size, invalidate]);
  useFrame((_, dt) => {
    const o = orbit.current, c = cur.current;
    // eased by time, not frames: settles in about a third of a second at any frame rate
    const k = 1 - Math.exp(-Math.min(0.25, dt) * 14);
    c.az += (o.az - c.az) * k; c.pol += (o.pol - c.pol) * k; c.r += (o.r - c.r) * k;
    tmp.set(Math.sin(c.pol) * Math.sin(c.az), Math.cos(c.pol), Math.sin(c.pol) * Math.cos(c.az)).multiplyScalar(c.r).add(TARGET);
    camera.position.copy(tmp);
    camera.lookAt(TARGET);
    onFrame(camera, size);
    if (Math.abs(o.az - c.az) + Math.abs(o.pol - c.pol) + Math.abs(o.r - c.r) > 0.001) invalidate();
  });
  return null;
}

export interface RoomProps {
  scene: MalekScene;
  orbit: MutableRefObject<Orbit>;
  /** where each hotspot label should sit on screen; written every frame without re-rendering React */
  labels: MutableRefObject<Partial<Record<Hotspot, HTMLElement | null>>>;
  onPick: (h: Hotspot) => void;
  menuLines: { en: string; ar: string; price: string }[];
  /** true while a drag is under way, so a drag that ends over Malek is not a click on him */
  dragging: MutableRefObject<boolean>;
}

const ANCHORS: Record<Hotspot, THREE.Vector3> = {
  malek: new THREE.Vector3(),
  menu: new THREE.Vector3(-2.3, 2.95, -2.95),
  tables: new THREE.Vector3(1.3, 1.25, 1.0),
  exit: new THREE.Vector3(3.1, 2.55, 1.2),
};
// labels sit just above his head, not over him
const MALEK_ANCHOR: Record<'grill' | 'bench' | 'table', THREE.Vector3> = { grill: new THREE.Vector3(-3.17, 2.2, -0.75), bench: new THREE.Vector3(1.0, 2.15, -2.82), table: new THREE.Vector3(1.8, 1.95, -0.42) };

function Room({ scene, orbit, labels, onPick, menuLines, dragging }: RoomProps) {
  const tex = useTextures();
  const { invalidate } = useThree();
  useEffect(() => {
    const on = () => invalidate();
    window.addEventListener(INVALIDATE_EVENT, on);
    return () => window.removeEventListener(INVALIDATE_EVENT, on);
  }, [invalidate]);
  const closing = scene === 'closing';
  const spot = SCENE_SPOT[scene];
  const pick = (h: Hotspot) => { if (!dragging.current) onPick(h); };
  const plasterMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.plaster, roughness: 0.95 }), [tex]);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.floor, roughness: 0.9 }), [tex]);
  const board = useMemo(() => menuTexture(menuLines), [menuLines]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const onFrame = (cam: THREE.Camera, size: { width: number; height: number }) => {
    (Object.keys(ANCHORS) as Hotspot[]).forEach((h) => {
      const el = labels.current[h]; if (!el) return;
      tmp.copy(h === 'malek' ? MALEK_ANCHOR[spot] : ANCHORS[h]).project(cam);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * size.width}px, ${((1 - tmp.y) / 2) * size.height}px)`;
      el.style.opacity = vis ? '1' : '0';
      el.style.pointerEvents = vis ? 'auto' : 'none';
    });
  };
  return (
    <>
      <color attach="background" args={[closing ? '#1a1c2c' : '#e9d3a8']} />
      <hemisphereLight args={[closing ? '#7d86b8' : '#fff1d6', '#5c4228', closing ? 0.95 : 1.0]} />
      <directionalLight position={[5, 7, 4]} intensity={closing ? 0.25 : 1.6} color={closing ? '#8c93c7' : '#ffe2b0'} />
      <CameraRig orbit={orbit} onFrame={onFrame} />

      {/* floor and walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floorMat} raycast={() => null}><planeGeometry args={[W, D]} /></mesh>
      <Wall pos={[0, H / 2, -D / 2]} rot={[0, 0, 0]} size={[W, H]} normal={new THREE.Vector3(0, 0, 1)} mat={plasterMat} />
      <Wall pos={[-W / 2, H / 2, 0]} rot={[0, Math.PI / 2, 0]} size={[D, H]} normal={new THREE.Vector3(1, 0, 0)} mat={plasterMat} />
      <Wall pos={[W / 2, H / 2, 0]} rot={[0, -Math.PI / 2, 0]} size={[D, H]} normal={new THREE.Vector3(-1, 0, 0)} mat={plasterMat} />
      {/* the low front wall under the awning, either side of the open front */}
      <Wall pos={[0, 0.45, D / 2]} rot={[0, Math.PI, 0]} size={[W, 0.9]} normal={new THREE.Vector3(0, 0, -1)} mat={plasterMat} />

      {/* the street door in the right wall: a bright opening and the door swung back */}
      <group position={[W / 2 - 0.02, 0, 1.2]} onClick={(e) => { e.stopPropagation(); pick('exit'); }}>
        <mesh position={[0, 1.15, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.1, 2.3]} /><meshBasicMaterial color={closing ? '#2b3150' : '#fff4dc'} /></mesh>
        <mesh position={[-0.45, 1.15, 0.85]} rotation={[0, -0.5, 0]}><boxGeometry args={[0.06, 2.3, 1.05]} /><meshStandardMaterial map={tex.wood} roughness={0.9} /></mesh>
        <mesh position={[-0.45, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><planeGeometry args={[0.8, 1.1]} /><meshStandardMaterial color="#a5824e" roughness={1} /></mesh>
      </group>

      {/* the storeroom doorway at the back right: dark beyond a cloth curtain */}
      <group position={[2.6, 0, -D / 2 + 0.03]}>
        <mesh position={[0, 1.1, 0]}><planeGeometry args={[1.0, 2.2]} /><meshBasicMaterial color="#120c08" /></mesh>
        <mesh position={[0.18, 1.2, 0.04]}><planeGeometry args={[0.6, 2.0]} /><meshStandardMaterial map={tex.cloth} side={THREE.DoubleSide} roughness={1} /></mesh>
      </group>

      {/* the menu board on the back wall, by the grill */}
      <mesh position={[-2.3, 2.3, -D / 2 + 0.03]} onClick={(e) => { e.stopPropagation(); pick('menu'); }}>
        <planeGeometry args={[1.25, 0.94]} />
        <meshBasicMaterial map={board} />
      </mesh>

      <Grill cold={closing} tex={tex} />
      <Shelves tex={tex} />
      <Bench tex={tex} />
      <Table x={1.95} z={0.1} tex={tex} onPick={() => pick('tables')} />
      <Table x={0.6} z={1.4} tex={tex} onPick={() => pick('tables')} />
      <Lamp p={[2.2, 0.86, 0.15]} on={closing} />
      <Lamp p={[3.3, 2.2, -1.2]} on />
      <Lamp p={[-1.6, 2.4, -2.75]} on={closing} />
      <MalekFigure spot={spot} onPick={() => pick('malek')} />
    </>
  );
}

export default function MalekRoom3D(props: RoomProps & { onLost: () => void }) {
  const { onLost, ...room } = props;
  const lost = useRef(onLost); lost.current = onLost;
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={{ fov: 42, near: 0.1, far: 80, position: [0, 6, 10] }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        if (import.meta.env.DEV) (window as unknown as { __malekGl?: THREE.WebGLRenderer }).__malekGl = gl;
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost.current(); });
      }}
      data-testid="malek-canvas"
    >
      <Room {...room} />
    </Canvas>
  );
}

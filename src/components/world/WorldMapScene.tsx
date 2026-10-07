import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { MapControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import worldGlbUrl from "@/assets/world/world.glb?url";
import provincesPngUrl from "@/assets/world/world-provinces.png?url";
import {
  SEA_ID,
  TINT_SLOTS,
  WORLD_COUNTRIES,
  WORLD_SEAS,
  WORLD_SHEET,
  atlasToWorld,
  provinceAt,
  worldToAtlas,
  type WorldProvince,
} from "@/lib/world/world";

export interface WorldHover {
  province: WorldProvince;
  clientX: number;
  clientY: number;
}

export interface WorldMapSceneProps {
  en: boolean;
  decorative: boolean;
  selectedId: number | null;
  /** Optional per-province wash: RGBA bytes indexed by province id (alpha = strength). */
  tints?: Uint8Array | null;
  onHover: (hover: WorldHover | null) => void;
  onSelect: (province: WorldProvince | null) => void;
  onFailed: () => void;
}

/** Ocean colour at the sheet margin, so the board fades into an endless sea. */
const DEEP_SEA = "#6f8f8c";
const HALF_W = WORLD_SHEET.w / 200;
const HALF_H = WORLD_SHEET.h / 200;

/**
 * Province highlight in the terrain shader: the full-resolution id texture is
 * read with texelFetch so the tint follows the exact Blender borders.
 */
function useHighlightMaterial(material: THREE.MeshStandardMaterial, ids: THREE.Texture) {
  const uniforms = useMemo(() => {
    const layer = new THREE.DataTexture(new Uint8Array(TINT_SLOTS * 4), TINT_SLOTS, 1, THREE.RGBAFormat);
    layer.colorSpace = THREE.NoColorSpace;
    layer.magFilter = layer.minFilter = THREE.NearestFilter;
    layer.needsUpdate = true;
    return {
      uPick: { value: ids },
      uPickMax: { value: new THREE.Vector2(1, 1) },
      uHover: { value: -1 },
      uSelected: { value: -1 },
      uLayer: { value: layer },
    };
  }, [ids]);
  useEffect(() => {
    const img = ids.image as { width: number; height: number };
    uniforms.uPickMax.value.set(img.width - 1, img.height - 1);
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform sampler2D uPick;
uniform vec2 uPickMax;
uniform float uHover;
uniform float uSelected;
uniform sampler2D uLayer;`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
#ifdef USE_MAP
{
  ivec2 pc = clamp(ivec2(floor(vMapUv * uPickMax + 0.5)), ivec2(0), ivec2(uPickMax));
  float pid = floor(texelFetch(uPick, pc, 0).r * 255.0 + 0.5);
  if (pid < ${SEA_ID - 0.5}) {
    vec4 wash = texelFetch(uLayer, ivec2(int(pid), 0), 0);
    diffuseColor.rgb = mix(diffuseColor.rgb, wash.rgb, wash.a);
    if (abs(pid - uSelected) < 0.5) {
      // Engraved brass hatching reads on every country tint, gold ones included.
      float hatch = step(0.5, fract((vMapUv.x * ${WORLD_SHEET.w}.0 + vMapUv.y * ${WORLD_SHEET.h}.0) / 16.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.29, 0.07), mix(0.12, 0.5, hatch));
    }
    else if (abs(pid - uHover) < 0.5) diffuseColor.rgb = min(diffuseColor.rgb * 1.18 + 0.04, vec3(1.0));
  }
}
#endif`,
        );
    };
    material.customProgramCacheKey = () => "world-highlight";
    material.needsUpdate = true;
  }, [material, ids, uniforms]);
  return uniforms;
}

function World({
  decorative,
  selectedId,
  tints,
  onHover,
  onSelect,
}: Pick<WorldMapSceneProps, "decorative" | "selectedId" | "tints" | "onHover" | "onSelect">) {
  const { scene } = useGLTF(worldGlbUrl);
  const ids = useLoader(THREE.TextureLoader, provincesPngUrl);
  const invalidate = useThree((s) => s.invalidate);

  const terrain = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!mesh && o instanceof THREE.Mesh && o.name.startsWith("WorldTerrain")) mesh = o;
    });
    return mesh as THREE.Mesh | null;
  }, [scene]);

  useMemo(() => {
    ids.colorSpace = THREE.NoColorSpace;
    ids.flipY = false;
    ids.magFilter = ids.minFilter = THREE.NearestFilter;
    ids.generateMipmaps = false;
    ids.needsUpdate = true;
  }, [ids]);

  const uniforms = useHighlightMaterial(terrain!.material as THREE.MeshStandardMaterial, ids);
  const hoverId = useRef(-1);

  useEffect(() => {
    uniforms.uSelected.value = selectedId ?? -1;
    invalidate();
  }, [selectedId, uniforms, invalidate]);

  useEffect(() => {
    const tex = uniforms.uLayer.value;
    const data = tex.image.data as Uint8Array;
    data.fill(0);
    if (tints) data.set(tints.subarray(0, data.length));
    tex.needsUpdate = true;
    invalidate();
  }, [tints, uniforms, invalidate]);

  const setHover = (id: number) => {
    if (hoverId.current === id) return;
    hoverId.current = id;
    uniforms.uHover.value = id;
    invalidate();
  };

  const at = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const [x, y] = worldToAtlas(e.point.x, e.point.z);
    return provinceAt(x, y);
  };

  return (
    <>
      <primitive
        object={scene}
        onPointerMove={
          decorative
            ? undefined
            : (e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                const p = at(e);
                setHover(p?.id ?? -1);
                onHover(p ? { province: p, clientX: e.clientX, clientY: e.clientY } : null);
              }
        }
        onPointerOut={
          decorative
            ? undefined
            : () => {
                setHover(-1);
                onHover(null);
              }
        }
        onClick={
          decorative
            ? undefined
            : (e: ThreeEvent<MouseEvent>) => {
                if (e.delta > 6) return; // a drag that ended here, not a click
                e.stopPropagation();
                onSelect(at(e));
              }
        }
      />
      {/* Endless ocean under and beyond the board. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={DEEP_SEA} roughness={0.9} />
      </mesh>
    </>
  );
}

interface MapLabel {
  key: string;
  kind: "country" | "sea";
  text: string;
  at: THREE.Vector3;
}

function mapLabels(en: boolean): MapLabel[] {
  return [
    ...WORLD_COUNTRIES.map((c) => ({
      key: c.id,
      kind: "country" as const,
      text: en ? c.en.toUpperCase() : c.zh.split("").join(" "),
      at: new THREE.Vector3(...atlasToWorld(c.center[0], c.center[1], 0.35)),
    })),
    ...WORLD_SEAS.map((s) => ({
      key: s.zh,
      kind: "sea" as const,
      text: en ? s.en : s.zh.split("").join(" "),
      at: new THREE.Vector3(...atlasToWorld(s.at[0], s.at[1], 0.05)),
    })),
  ];
}

/**
 * Projects the HTML labels each rendered frame by writing transforms straight
 * to their nodes, so panning never re-renders React.
 */
function LabelProjector({ labels, nodes }: { labels: MapLabel[]; nodes: React.RefObject<(HTMLSpanElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    labels.forEach((label, i) => {
      const el = nodes.current[i];
      if (!el) return;
      v.copy(label.at).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      el.style.visibility = visible ? "visible" : "hidden";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    });
  });
  return null;
}

const TARGET = new THREE.Vector3(0, 0, 0.6);
const VIEW_DIR = new THREE.Vector3(0, 13.5, 9).normalize();
const LION = WORLD_COUNTRIES.find((c) => c.id === "lion")!;
// Aim south of the Lion Kingdom so it sits in the band the menu's paper scrims leave clear.
const LION_FOCUS = new THREE.Vector3(...atlasToWorld(LION.center[0], LION.center[1] + 380));

/** Distance at which the whole board fits the viewport (portrait phones need more). */
function fitDistance(aspect: number, fov: number) {
  const v = THREE.MathUtils.degToRad(fov) / 2;
  const h = Math.atan(Math.tan(v) * aspect);
  return Math.max((HALF_W * 1.02) / Math.tan(h), (HALF_H * 0.95) / Math.tan(v));
}

/**
 * Frames the whole board on mount, whatever the viewport's aspect. A portrait
 * backdrop can't fit the board, and its centre is open sea, so it frames the
 * Lion Kingdom instead.
 */
function useFitCamera(backdrop: boolean) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const [view] = useState(() => {
    const fit = fitDistance(aspect, camera.fov);
    if (backdrop && aspect < 1) return { fit: Math.min(fit, 24), target: LION_FOCUS };
    return { fit: THREE.MathUtils.clamp(fit, 8, 80), target: TARGET };
  });
  useEffect(() => {
    camera.position.copy(view.target).addScaledVector(VIEW_DIR, view.fit);
    camera.lookAt(view.target);
  }, [camera, view]);
  return view;
}

function FitCamera() {
  useFitCamera(true);
  return null;
}

/** Keep the camera's look-at point over the board while panning. */
function BoundedControls() {
  const controls = useRef<MapControlsImpl>(null);
  const { fit, target } = useFitCamera(false);
  useEffect(() => {
    controls.current?.target.copy(target);
    controls.current?.update();
  }, [fit, target]);
  return (
    <MapControls
      ref={controls}
      makeDefault
      enableRotate={false}
      enableDamping={false}
      screenSpacePanning={false}
      zoomToCursor
      minDistance={5}
      maxDistance={Math.max(22, fit)}
      onChange={() => {
        const c = controls.current;
        if (!c) return;
        const t = c.target;
        const x = THREE.MathUtils.clamp(t.x, -HALF_W, HALF_W);
        const z = THREE.MathUtils.clamp(t.z, -HALF_H, HALF_H);
        if (x !== t.x || z !== t.z) {
          c.object.position.x += x - t.x;
          c.object.position.z += z - t.z;
          t.set(x, t.y, z);
        }
      }}
    />
  );
}

export default function WorldMapScene({
  en,
  decorative,
  selectedId,
  tints,
  onHover,
  onSelect,
  onFailed,
}: WorldMapSceneProps) {
  // Warm-up: a short always-window after mount guarantees the first frames
  // land in compositors that drop purely demand-driven initial paints.
  const [warm, setWarm] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setWarm(false), 1800);
    return () => window.clearTimeout(t);
  }, []);
  // Backdrops stay unlabelled: names there would fight the menu masthead.
  const labels = useMemo(() => (decorative ? [] : mapLabels(en)), [decorative, en]);
  const labelNodes = useRef<(HTMLSpanElement | null)[]>([]);
  return (
    <>
    <Canvas
      flat
      frameloop={warm ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 13.5, 9.6], fov: 40, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      onCreated={(state) => {
        try {
          const ctx = state.gl.getContext();
          if (!ctx || ctx.isContextLost()) onFailed();
          state.gl.setClearColor(DEEP_SEA);
          state.camera.lookAt(0, 0, 0.6);
          state.invalidate();
          requestAnimationFrame(() => state.invalidate());
        } catch {
          onFailed();
        }
      }}
      onPointerMissed={() => !decorative && onSelect(null)}
    >
      <hemisphereLight args={["#fff8ea", "#6f8f8c", 1.1]} />
      <directionalLight position={[-6, 14, 8]} intensity={1.5} />
      <World decorative={decorative} selectedId={selectedId} tints={tints} onHover={onHover} onSelect={onSelect} />
      <LabelProjector labels={labels} nodes={labelNodes} />
      {decorative ? <FitCamera /> : <BoundedControls />}
    </Canvas>
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {labels.map((label, i) => (
        <span
          key={label.key}
          ref={(el) => {
            labelNodes.current[i] = el;
          }}
          className={`world-label world-label-${label.kind}`}
          style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}
        >
          {label.text}
        </span>
      ))}
    </div>
    </>
  );
}

useGLTF.preload(worldGlbUrl);

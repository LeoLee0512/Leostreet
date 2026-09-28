import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import type { Economy, SectorId } from "@/lib/story/economy";
import {
  ATLAS_COUNTRY_TINT,
  ATLAS_ISLANDS,
  ATLAS_LAND,
  ATLAS_NEIGHBOR_LANDS,
  ATLAS_NEIGHBORS,
  ATLAS_RAIL,
  ATLAS_RAIL_SPUR,
  ATLAS_REGIONS,
  ATLAS_RIVER,
  ATLAS_RIVER_WEST,
  ATLAS_ROUTES,
  ATLAS_SHEET,
  type AtlasLayer,
  type AtlasPoint,
} from "@/lib/story/atlas";
import {
  ATLAS_BRASS_TOWER,
  ATLAS_HEIGHTS,
  ATLAS_LAND_HEIGHT,
  ATLAS_MONUMENTS,
  ATLAS_PORTS,
  ATLAS_RAIL_HEIGHT,
  ATLAS_RIVER_HEIGHT,
  ATLAS_SETTLEMENTS,
  ATLAS_TILT,
} from "./StoryAtlasGeo";

export interface StoryAtlasSceneProps {
  economy: Economy;
  selected: SectorId;
  layer: AtlasLayer;
  zoom: number;
  pan: { x: number; y: number };
  decorative: boolean;
  onSelectRegion?: (id: SectorId) => void;
  onFailed: () => void;
}

/** Atlas data coords (2400×1500 sheet) → sandbox world: X east, Z south, Y up. */
const wx = (x: number) => x - ATLAS_SHEET.cx;
const wz = (y: number) => y - ATLAS_SHEET.cy;

function shapeFrom(points: readonly AtlasPoint[]) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    // Shape Y is negated so rotateX(-90°) lays the sheet out with south = +Z.
    if (i) shape.lineTo(wx(x), -wz(y));
    else shape.moveTo(wx(x), -wz(y));
  });
  return shape;
}

function plateGeometry(points: readonly AtlasPoint[], depth: number) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(points), {
    depth,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Flat political fill draped just above the land plate. */
function flatGeometry(points: readonly AtlasPoint[]) {
  const geo = new THREE.ShapeGeometry(shapeFrom(points));
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function lineGeometry(points: readonly AtlasPoint[], height: number) {
  const verts: number[] = [];
  for (const [x, y] of points) verts.push(wx(x), height, wz(y));
  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(verts, 3),
  );
}

/** Chart-dashed polyline as plain segments, no dashed-material state needed. */
function dashedGeometry(points: readonly AtlasPoint[], height: number, dash = 14, gap = 9) {
  const verts: number[] = [];
  let carry = 0;
  let drawing = true;
  for (let i = 1; i < points.length; i++) {
    let [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    const segLen = Math.hypot(bx - ax, by - ay);
    const dx = (bx - ax) / segLen,
      dy = (by - ay) / segLen;
    let walked = 0;
    while (walked < segLen) {
      const step = Math.min(segLen - walked, (drawing ? dash : gap) - carry);
      if (drawing)
        verts.push(
          wx(ax + dx * walked),
          height,
          wz(ay + dy * walked),
          wx(ax + dx * (walked + step)),
          height,
          wz(ay + dy * (walked + step)),
        );
      walked += step;
      carry += step;
      if (carry >= (drawing ? dash : gap) - 1e-6) {
        carry = 0;
        drawing = !drawing;
      }
    }
  }
  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(verts, 3),
  );
}

/** Flat ribbon (river, railway) draped above the relief at a fixed height. */
function ribbonGeometry(points: readonly AtlasPoint[], width: number, height: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  const half = width / 2;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]!;
    const prev = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(points.length - 1, i + 1)]!;
    let dx = wx(next[0]) - wx(prev[0]),
      dz = wz(next[1]) - wz(prev[1]);
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    positions.push(wx(x) - dz * half, height, wz(y) + dx * half);
    positions.push(wx(x) + dz * half, height, wz(y) - dx * half);
    if (i) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const PAPER = {
  water: "#d6c5a0",
  land: "#e8dcc0",
  landDawei: "#e0d8c4",
  landRamona: "#ecdcba",
  border: "#6b5636",
  accent: "#8f6d1f",
  graticule: "#b09b74",
  low: "#b8765a",
  mid: "#c9a95e",
  high: "#7e9a6a",
  house: "#cbb98f",
  tower: "#b3a179",
  mill: "#4a3a24",
  pier: "#3a2c18",
  sail: "#f2e8cf",
  brass: "#b08d3e",
  wax: "#9e2f25",
};
const TINT: Record<SectorId, string> = {
  materials: "#b08a2e",
  industry: "#546e4a",
  transport: "#94564a",
};

/** Deterministic scatter: the surveyor's hand, not noise. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type Instance = { p: [number, number, number]; s: [number, number, number]; ry?: number };

function Instances({
  items,
  geometry,
  color,
  metalness = 0,
  roughness = 1,
}: {
  items: Instance[];
  geometry: THREE.BufferGeometry;
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    items.forEach((it, i) => {
      e.set(0, it.ry ?? 0, 0);
      q.setFromEuler(e);
      m.compose(v.set(...it.p), q, sc.set(...it.s));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </instancedMesh>
  );
}

function CameraRig({ zoom, pan }: { zoom: number; pan: { x: number; y: number } }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const dist = 2000;
    const tx = -pan.x,
      tz = -pan.y;
    camera.left = -size.width / 2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = -size.height / 2;
    camera.near = 1;
    camera.far = 5000;
    camera.zoom =
      Math.min(size.width / ATLAS_SHEET.w, size.height / ATLAS_SHEET.h) * zoom;
    camera.position.set(
      tx,
      dist * Math.sin(ATLAS_TILT),
      tz + dist * Math.cos(ATLAS_TILT),
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(tx, 0, tz);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, zoom, pan, invalidate]);
  return null;
}

/** Static plates and survey lines; geometry is authored once per session. */
function useSandboxGeometry() {
  return useMemo(() => {
    const graticule: number[] = [];
    for (let x = -1440; x <= 1440; x += 80)
      graticule.push(x, 0.5, -1000, x, 0.5, 1000);
    for (let y = -1000; y <= 1000; y += 80)
      graticule.push(-1440, 0.5, y, 1440, 0.5, y);
    return {
      land: plateGeometry(ATLAS_LAND, ATLAS_LAND_HEIGHT),
      coast: lineGeometry(ATLAS_LAND, ATLAS_LAND_HEIGHT + 0.4),
      neighborLands: ATLAS_NEIGHBOR_LANDS.map((l) =>
        plateGeometry(l, ATLAS_LAND_HEIGHT),
      ),
      neighborCoasts: ATLAS_NEIGHBOR_LANDS.map((l) =>
        lineGeometry(l, ATLAS_LAND_HEIGHT + 0.4),
      ),
      islands: ATLAS_ISLANDS.map((i) => plateGeometry(i, ATLAS_LAND_HEIGHT - 1)),
      islandCoasts: ATLAS_ISLANDS.map((i) => lineGeometry(i, ATLAS_LAND_HEIGHT - 0.4)),
      // Political fills are staggered by a hair so abutting provinces never z-fight.
      neighbors: ATLAS_NEIGHBORS.map((r, i) => ({
        id: r.id,
        country: r.country,
        fill: flatGeometry(r.boundary),
        border: lineGeometry(r.boundary, 0),
        lift: ATLAS_LAND_HEIGHT + 0.5 + i * 0.07,
      })),
      regions: ATLAS_REGIONS.map((r) => ({
        id: r.id,
        geometry: plateGeometry(r.boundary, ATLAS_HEIGHTS[r.id]),
        border: lineGeometry(r.boundary, 0), // re-based per render at relief height
      })),
      river: ribbonGeometry(ATLAS_RIVER, 7, ATLAS_RIVER_HEIGHT),
      riverWest: ribbonGeometry(ATLAS_RIVER_WEST, 5.5, ATLAS_LAND_HEIGHT + 0.8),
      rail: ribbonGeometry(ATLAS_RAIL, 2.6, ATLAS_RAIL_HEIGHT),
      railSpur: ribbonGeometry(ATLAS_RAIL_SPUR, 2.2, ATLAS_LAND_HEIGHT + 0.9),
      routes: ATLAS_ROUTES.map((r) => dashedGeometry(r.points, 1.4)),
      graticule: new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(graticule, 3),
      ),
    };
  }, []);
}

/** Buildings, harbours, monuments: all instanced or merged, authored once. */
function useWorldDetail() {
  return useMemo(() => {
    const houses: Instance[] = [];
    const towers: Instance[] = [];
    const chimneys: Instance[] = [];
    ATLAS_SETTLEMENTS.forEach((s, si) => {
      const count = s.size === "metro" ? 22 : s.size === "city" ? 15 : 9;
      const towerCount = s.size === "metro" ? 7 : s.size === "city" ? 4 : 0;
      const spread = s.size === "metro" ? 46 : s.size === "city" ? 36 : 26;
      for (let i = 0; i < count; i++) {
        const a = rand(si * 91 + i * 7) * Math.PI * 2;
        const r = 10 + rand(si * 53 + i * 13) * spread;
        const w = 5 + rand(si * 17 + i * 3) * 4;
        const d = 5 + rand(si * 29 + i * 5) * 4;
        const h = 5 + rand(si * 41 + i * 11) * 6;
        houses.push({
          p: [wx(s.point[0]) + Math.cos(a) * r, s.ground + h / 2, wz(s.point[1]) + Math.sin(a) * r],
          s: [w, h, d],
          ry: rand(si * 7 + i) * Math.PI,
        });
      }
      for (let i = 0; i < towerCount; i++) {
        const a = rand(si * 131 + i * 17) * Math.PI * 2;
        const r = rand(si * 23 + i * 19) * 16;
        const w = 7 + rand(si * 37 + i) * 3;
        const h = 17 + rand(si * 61 + i * 7) * 14;
        towers.push({
          p: [wx(s.point[0]) + Math.cos(a) * r, s.ground + h / 2, wz(s.point[1]) + Math.sin(a) * r],
          s: [w, h, w],
          ry: rand(si * 11 + i) * Math.PI,
        });
      }
      if (s.mills)
        for (let i = 0; i < 3; i++) {
          const a = rand(si * 71 + i * 31) * Math.PI * 2;
          const r = spread * 0.7 + i * 6;
          chimneys.push({
            p: [wx(s.point[0]) + Math.cos(a) * r, s.ground + 9, wz(s.point[1]) + Math.sin(a) * r],
            s: [1.9, 18, 1.9],
          });
        }
    });
    const piers: Instance[] = [];
    const hulls: Instance[] = [];
    const sails: Instance[] = [];
    const moor = (x: number, z: number, ry: number, seed: number) => {
      hulls.push({ p: [x, 1.6, z], s: [11, 3.2, 4.5], ry });
      sails.push({
        p: [x + Math.cos(ry + Math.PI / 2) * 1.5, 6.5, z + Math.sin(ry + Math.PI / 2) * 1.5],
        s: [0.8, 9, 6],
        ry: ry + (rand(seed) - 0.5) * 0.2,
      });
    };
    ATLAS_PORTS.forEach((port, pi) => {
      const cx = wx(port.point[0]),
        cz = wz(port.point[1]);
      const dx = Math.cos(port.angle),
        dz = Math.sin(port.angle);
      piers.push({ p: [cx + dx * 17, 2, cz + dz * 17], s: [34, 2, 7], ry: -port.angle });
      moor(cx + dx * 34 + dz * 8, cz + dz * 34 - dx * 8, -port.angle + 0.3, pi * 7 + 1);
      moor(cx + dx * 40 - dz * 7, cz + dz * 40 + dx * 7, -port.angle - 0.4, pi * 7 + 2);
    });
    // Merchantmen under way along the charted routes.
    ATLAS_ROUTES.forEach((route, ri) => {
      for (const t of [0.3, 0.62]) {
        const idx = Math.min(
          route.points.length - 2,
          Math.floor(t * (route.points.length - 1)),
        );
        const a = route.points[idx]!,
          b = route.points[idx + 1]!;
        const f = t * (route.points.length - 1) - idx;
        const x = wx(a[0] + (b[0] - a[0]) * f),
          z = wz(a[1] + (b[1] - a[1]) * f);
        moor(x, z, Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, 100 + ri * 13 + t);
      }
    });
    return {
      houses,
      towers,
      chimneys,
      piers,
      hulls,
      sails,
      box: new THREE.BoxGeometry(1, 1, 1),
      chimney: new THREE.CylinderGeometry(1, 1.3, 1, 8),
    };
  }, []);
}

function WorldDetail() {
  const d = useWorldDetail();
  return (
    <>
      <Instances items={d.houses} geometry={d.box} color={PAPER.house} />
      <Instances items={d.towers} geometry={d.box} color={PAPER.tower} />
      <Instances items={d.chimneys} geometry={d.chimney} color={PAPER.mill} />
      <Instances items={d.piers} geometry={d.box} color={PAPER.pier} />
      <Instances items={d.hulls} geometry={d.box} color={PAPER.pier} />
      <Instances items={d.sails} geometry={d.box} color={PAPER.sail} roughness={0.9} />
      {ATLAS_MONUMENTS.map((m) =>
        m.kind === "obelisk" ? (
          <mesh
            key="obelisk"
            position={[wx(m.point[0]), m.ground + 15, wz(m.point[1])]}
            castShadow
          >
            <cylinderGeometry args={[0.6, 3.4, 30, 4]} />
            <meshStandardMaterial color={PAPER.tower} roughness={0.9} />
          </mesh>
        ) : (
          <group key="lighthouse" position={[wx(m.point[0]), m.ground, wz(m.point[1])]}>
            <mesh position={[0, 11, 0]} castShadow>
              <cylinderGeometry args={[3.2, 4.4, 22, 8]} />
              <meshStandardMaterial color={PAPER.sail} roughness={0.9} />
            </mesh>
            <mesh position={[0, 24, 0]} castShadow>
              <cylinderGeometry args={[3.6, 3.6, 4.5, 8]} />
              <meshStandardMaterial
                color={PAPER.wax}
                roughness={0.7}
                emissive={PAPER.wax}
                emissiveIntensity={0.25}
              />
            </mesh>
          </group>
        ),
      )}
      {/* The brass exchange tower of Tidemarch. */}
      <group
        position={[
          wx(ATLAS_BRASS_TOWER.point[0]),
          ATLAS_BRASS_TOWER.ground,
          wz(ATLAS_BRASS_TOWER.point[1]),
        ]}
      >
        <mesh position={[0, 32, 0]} castShadow>
          <cylinderGeometry args={[8, 10, 64, 10]} />
          <meshStandardMaterial
            color={PAPER.brass}
            metalness={0.4}
            roughness={0.45}
            emissive={PAPER.accent}
            emissiveIntensity={0.18}
          />
        </mesh>
        <mesh position={[0, 73, 0]} castShadow>
          <cylinderGeometry args={[5, 6.5, 18, 10]} />
          <meshStandardMaterial
            color={PAPER.brass}
            metalness={0.4}
            roughness={0.45}
            emissive={PAPER.accent}
            emissiveIntensity={0.18}
          />
        </mesh>
        <mesh position={[0, 85, 0]} castShadow>
          <sphereGeometry args={[4.6, 12, 10]} />
          <meshStandardMaterial
            color={PAPER.brass}
            metalness={0.9}
            roughness={0.25}
            emissive={PAPER.accent}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </>
  );
}

function Sandbox({
  economy,
  selected,
  layer,
  decorative,
  onSelectRegion,
}: Omit<StoryAtlasSceneProps, "zoom" | "pan" | "onFailed">) {
  const geo = useSandboxGeometry();
  const colors = useMemo(() => {
    const land = new THREE.Color(PAPER.land);
    const result = {} as Record<SectorId, { top: THREE.Color; side: THREE.Color }>;
    for (const region of ATLAS_REGIONS) {
      const value =
        layer === "economy"
          ? economy.utilization[region.id]
          : layer === "livelihoods"
            ? economy.income / 100
            : region.id === "materials"
              ? economy.materials / 14
              : region.id === "industry"
                ? economy.goods / 10
                : economy.sales / Math.max(1, economy.demand);
      const wash = new THREE.Color(
        value < 0.45 ? PAPER.low : value < 0.8 ? PAPER.mid : PAPER.high,
      );
      const top = land
        .clone()
        .lerp(new THREE.Color(TINT[region.id]), 0.3)
        .lerp(wash, 0.55);
      result[region.id] = { top, side: top.clone().multiplyScalar(0.72) };
    }
    return result;
  }, [economy, layer]);

  const materials = useMemo(() => {
    const set = {} as Record<
      SectorId,
      [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]
    >;
    for (const region of ATLAS_REGIONS) {
      const isSelected = !decorative && region.id === selected;
      const c = colors[region.id];
      set[region.id] = [
        new THREE.MeshStandardMaterial({
          color: c.top,
          roughness: 0.95,
          metalness: 0,
          emissive: PAPER.accent,
          emissiveIntensity: isSelected ? 0.14 : 0,
        }),
        new THREE.MeshStandardMaterial({
          color: c.side,
          roughness: 1,
          metalness: 0,
        }),
      ];
    }
    return set;
  }, [colors, selected, decorative]);
  useEffect(() => {
    return () => {
      for (const pair of Object.values(materials))
        for (const material of pair) material.dispose();
    };
  }, [materials]);

  const neighborFills = useMemo(
    () =>
      geo.neighbors.map((n) => ({
        ...n,
        color: new THREE.Color(PAPER.land)
          .lerp(new THREE.Color(ATLAS_COUNTRY_TINT[n.country]), 0.5),
      })),
    [geo],
  );

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[-420, 720, 260]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1500}
        shadow-camera-right={1500}
        shadow-camera-top={1100}
        shadow-camera-bottom={-1100}
        shadow-camera-near={100}
        shadow-camera-far={2600}
      />
      {/* Paper sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6000, 4200]} />
        <meshStandardMaterial color={PAPER.water} roughness={1} metalness={0} />
      </mesh>
      <lineSegments geometry={geo.graticule}>
        <lineBasicMaterial color={PAPER.graticule} transparent opacity={0.35} />
      </lineSegments>
      {/* Continental shelf */}
      <mesh geometry={geo.land} castShadow receiveShadow>
        <meshStandardMaterial color={PAPER.land} roughness={1} metalness={0} />
      </mesh>
      <lineLoop geometry={geo.coast}>
        <lineBasicMaterial color={PAPER.border} />
      </lineLoop>
      {geo.neighborLands.map((land, i) => (
        <group key={i}>
          <mesh geometry={land} castShadow receiveShadow>
            <meshStandardMaterial
              color={i === 0 ? PAPER.landDawei : PAPER.landRamona}
              roughness={1}
              metalness={0}
            />
          </mesh>
          <lineLoop geometry={geo.neighborCoasts[i]!}>
            <lineBasicMaterial color={PAPER.border} />
          </lineLoop>
        </group>
      ))}
      {geo.islands.map((island, i) => (
        <group key={i}>
          <mesh geometry={island} castShadow receiveShadow>
            <meshStandardMaterial color={PAPER.land} roughness={1} metalness={0} />
          </mesh>
          <lineLoop geometry={geo.islandCoasts[i]!}>
            <lineBasicMaterial color={PAPER.border} />
          </lineLoop>
        </group>
      ))}
      {/* Neighbor provinces: flat political washes, scenery only. */}
      {neighborFills.map((n) => (
        <group key={n.id}>
          <mesh geometry={n.fill} position={[0, n.lift, 0]} receiveShadow>
            <meshStandardMaterial
              color={n.color}
              roughness={1}
              metalness={0}
              transparent
              opacity={0.85}
            />
          </mesh>
          <lineLoop geometry={n.border} position={[0, n.lift + 0.1, 0]}>
            <lineBasicMaterial color={PAPER.border} transparent opacity={0.7} />
          </lineLoop>
        </group>
      ))}
      {/* Province relief blocks: paper tops washed with political color. */}
      {geo.regions.map((region) => {
        const isSelected = !decorative && region.id === selected;
        const raise = isSelected ? 2.5 : 0;
        return (
          <group key={region.id} position={[0, raise, 0]}>
            <mesh
              geometry={region.geometry}
              castShadow
              receiveShadow
              material={materials[region.id]}
              onClick={
                decorative || !onSelectRegion
                  ? undefined
                  : (event) => {
                      if (event.delta > 6) return;
                      event.stopPropagation();
                      onSelectRegion(region.id);
                    }
              }
            />
            <lineLoop
              geometry={region.border}
              position={[0, ATLAS_HEIGHTS[region.id] + 0.5, 0]}
            >
              <lineBasicMaterial
                color={isSelected ? PAPER.accent : PAPER.border}
              />
            </lineLoop>
          </group>
        );
      })}
      {/* Rivers and railways, raised causeways in the survey manner. */}
      <mesh geometry={geo.river}>
        <meshStandardMaterial color={PAPER.water} roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={geo.riverWest}>
        <meshStandardMaterial color={PAPER.water} roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={geo.rail}>
        <meshStandardMaterial color="#3a2c18" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={geo.railSpur}>
        <meshStandardMaterial color="#3a2c18" roughness={1} metalness={0} />
      </mesh>
      {/* Charted sea lanes. */}
      {geo.routes.map((route, i) => (
        <lineSegments key={i} geometry={route}>
          <lineBasicMaterial color={PAPER.accent} transparent opacity={0.75} />
        </lineSegments>
      ))}
      <WorldDetail />
    </>
  );
}

/** Client-only 3D sandbox; StoryAtlas mounts it lazily after a WebGL check. */
export default function StoryAtlasScene({
  zoom,
  pan,
  onFailed,
  ...sandbox
}: StoryAtlasSceneProps) {
  // Warm-up: a short always-window after mount guarantees the first frames
  // land in compositors that drop purely demand-driven initial paints.
  const [warm, setWarm] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setWarm(false), 1800);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <Canvas
      orthographic
      shadows
      frameloop={warm ? "always" : "demand"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={(state) => {
        try {
          const ctx = state.gl.getContext();
          if (!ctx || ctx.isContextLost()) onFailed();
          state.invalidate();
          requestAnimationFrame(() => state.invalidate());
        } catch {
          onFailed();
        }
      }}
    >
      <CameraRig zoom={zoom} pan={pan} />
      <Sandbox {...sandbox} />
    </Canvas>
  );
}

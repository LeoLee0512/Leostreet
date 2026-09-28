import { useMemo } from "react";
import {
  CanvasTexture,
  ExtrudeGeometry,
  Shape,
  SRGBColorSpace,
} from "three";

function makeShieldShape(): Shape {
  const s = new Shape();
  s.moveTo(-0.8, 0.95);
  s.lineTo(0.8, 0.95);
  s.lineTo(0.8, 0.1);
  s.bezierCurveTo(0.8, -0.5, 0.45, -0.85, 0, -1.05);
  s.bezierCurveTo(-0.45, -0.85, -0.8, -0.5, -0.8, 0.1);
  s.closePath();
  return s;
}

function makeLionTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const cx = 128;
  const cy = 122;
  g.strokeStyle = "#4a3810";
  g.fillStyle = "#4a3810";
  g.lineWidth = 5;
  g.lineCap = "round";
  g.lineJoin = "round";

  // 鬃毛：锯齿圆
  g.beginPath();
  const spikes = 14;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 74 : 56;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.stroke();

  // 面部
  g.beginPath();
  g.arc(cx, cy, 44, 0, Math.PI * 2);
  g.stroke();

  // 耳朵
  g.beginPath();
  g.arc(cx - 34, cy - 34, 10, Math.PI * 0.9, Math.PI * 1.9);
  g.stroke();
  g.beginPath();
  g.arc(cx + 34, cy - 34, 10, Math.PI * 1.1, Math.PI * 0.1, true);
  g.stroke();

  // 眼睛
  g.beginPath();
  g.arc(cx - 17, cy - 8, 4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(cx + 17, cy - 8, 4, 0, Math.PI * 2);
  g.fill();

  // 鼻 + 嘴
  g.beginPath();
  g.moveTo(cx - 9, cy + 10);
  g.lineTo(cx + 9, cy + 10);
  g.lineTo(cx, cy + 20);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(cx, cy + 20);
  g.lineTo(cx, cy + 28);
  g.quadraticCurveTo(cx - 8, cy + 34, cx - 16, cy + 30);
  g.moveTo(cx, cy + 28);
  g.quadraticCurveTo(cx + 8, cy + 34, cx + 16, cy + 30);
  g.stroke();

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export default function CrestMesh() {
  const geometry = useMemo(() => {
    const geo = new ExtrudeGeometry(makeShieldShape(), {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2,
    });
    geo.center();
    return geo;
  }, []);
  const lion = useMemo(() => makeLionTexture(), []);

  return (
    <group rotation={[0.05, -0.18, 0]} scale={0.95}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#c9a24a"
          metalness={0.32}
          roughness={0.42}
          emissive="#8f6d1f"
          emissiveIntensity={0.28}
        />
      </mesh>
      {/* 正面狮首纹章 */}
      <mesh position={[0, 0.05, 0.115]} scale={1.05}>
        <planeGeometry args={[1.15, 1.15]} />
        <meshStandardMaterial
          map={lion}
          transparent
          metalness={0.4}
          roughness={0.5}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
    </group>
  );
}

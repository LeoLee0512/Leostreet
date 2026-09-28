import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";

function makeCoinFaceTexture(glyph: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const cx = 128;
  const cy = 128;

  const bg = g.createRadialGradient(cx - 30, cy - 30, 20, cx, cy, 128);
  bg.addColorStop(0, "#c9a24a");
  bg.addColorStop(0.6, "#b08a2e");
  bg.addColorStop(1, "#8f6d1f");
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);

  // 边缘齿纹
  g.strokeStyle = "#6e5316";
  g.lineWidth = 5;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 118, cy + Math.sin(a) * 118);
    g.lineTo(cx + Math.cos(a) * 127, cy + Math.sin(a) * 127);
    g.stroke();
  }

  // 同心环
  for (const [r, w, col] of [
    [112, 3, "#7c5f1a"],
    [104, 1.5, "#d9b458"],
    [78, 2, "#7c5f1a"],
  ] as const) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.lineWidth = w;
    g.strokeStyle = col;
    g.stroke();
  }

  // 居中字符（阴刻 + 高光）
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 96px Georgia, 'Times New Roman', serif";
  g.fillStyle = "#d9b458";
  g.fillText(glyph, cx, cy + 4);
  g.fillStyle = "#6e5316";
  g.fillText(glyph, cx, cy);

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

interface CoinMeshProps {
  glyph: string;
  spinning: boolean;
}

export default function CoinMesh({ glyph, spinning }: CoinMeshProps) {
  const group = useRef<Group>(null);
  const texture = useMemo(() => makeCoinFaceTexture(glyph), [glyph]);

  useFrame((_, delta) => {
    if (spinning && group.current) {
      group.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group
      ref={group}
      rotation={spinning ? [0.15, 0, 0] : [0.15, -0.35, 0]}
      scale={1.05}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.14, 64]} />
        <meshStandardMaterial
          attach="material-0"
          color="#a5813a"
          metalness={0.35}
          roughness={0.42}
          emissive="#6e5316"
          emissiveIntensity={0.22}
        />
        <meshStandardMaterial
          attach="material-1"
          map={texture}
          color="#ffffff"
          metalness={0.3}
          roughness={0.4}
          emissive="#7c5f1a"
          emissiveIntensity={0.18}
        />
        <meshStandardMaterial
          attach="material-2"
          map={texture}
          color="#ffffff"
          metalness={0.3}
          roughness={0.4}
          emissive="#7c5f1a"
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  );
}

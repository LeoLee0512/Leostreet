import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, SphereGeometry } from "three";

function makeImprintTexture(glyph: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const cx = 128;
  const cy = 128;

  g.strokeStyle = "#5f1712";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, cy, 104, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, 92, 0, Math.PI * 2);
  g.stroke();

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 92px Georgia, 'Times New Roman', serif";
  // 阴刻：上暗下亮模拟凹陷
  g.fillStyle = "#d78d7e";
  g.fillText(glyph, cx, cy + 5);
  g.fillStyle = "#5f1712";
  g.fillText(glyph, cx, cy);

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 手按火漆：压扁球体 + 边缘顶点噪声。 */
function makeWaxGeometry(): SphereGeometry {
  const geo = new SphereGeometry(1, 48, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // 边缘（y≈0 赤道带）做噪声扰动
    const edge = 1 - Math.min(1, Math.abs(y) * 2.2);
    const a = Math.atan2(y, x);
    const n =
      Math.sin(a * 5.3 + 1.7) * 0.5 + Math.sin(a * 11.7 + 0.4) * 0.35 + 0.15;
    const k = 1 + n * 0.14 * edge;
    pos.setXYZ(i, x * k, y * k, pos.getZ(i));
  }
  geo.computeVertexNormals();
  geo.scale(1, 1, 0.34);
  return geo;
}

interface WaxSealMeshProps {
  glyph: string;
}

export default function WaxSealMesh({ glyph }: WaxSealMeshProps) {
  const geometry = useMemo(() => makeWaxGeometry(), []);
  const imprint = useMemo(() => makeImprintTexture(glyph), [glyph]);

  return (
    <group rotation={[-0.12, 0, -0.08]} scale={1.12}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#9e2f25"
          roughness={0.55}
          metalness={0}
          clearcoat={0.4}
          clearcoatRoughness={0.5}
        />
      </mesh>
      {/* 正面凹陷压印 */}
      <mesh position={[0, 0, 0.345]}>
        <circleGeometry args={[0.68, 48]} />
        <meshStandardMaterial
          map={imprint}
          transparent
          roughness={0.6}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
    </group>
  );
}

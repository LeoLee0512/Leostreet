import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LatheGeometry, Vector2, type Group } from "three";

// 瓷偶配色：象牙釉面 + 墨黑西装 + 黄铜件（低 metalness + 微 emissive 防发黑）
const SUIT = "#26211a";
const SUIT_SOFT = "#4a3620";
const BRASS = "#c19a3f";
const BRASS_DEEP = "#8a6a24";
const PORCELAIN = "#f6ecdc";
const SHIRT = "#f8f2e4";
const HAIR_MAN = "#3b2a1a";
const HAIR_WOMAN = "#43301c";
const GOWN = "#6e2734";
const GOWN_DARK = "#571d28";
const BLUSH = "#d9866f";
const EYE = "#2b2119";
const WAX = "#8e2f22";

// 无 envMap 的双灯场景下，金属件用低 metalness + 一点自发光才不会发黑
const brassMat = {
  color: BRASS,
  metalness: 0.3,
  roughness: 0.35,
  emissive: BRASS,
  emissiveIntensity: 0.18,
} as const;

const brassDeepMat = {
  color: BRASS_DEEP,
  metalness: 0.3,
  roughness: 0.4,
  emissive: BRASS_DEEP,
  emissiveIntensity: 0.14,
} as const;

const porcelainMat = { color: PORCELAIN, roughness: 0.32 } as const;

interface FigureMeshProps {
  variant: "man" | "woman";
  idle: boolean;
}

export default function FigureMesh({ variant, idle }: FigureMeshProps) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!idle || !group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.35) * 0.22;
    group.current.rotation.x = Math.sin(t * 0.22) * 0.02;
  });

  return (
    <group ref={group} rotation={[0.06, 0, 0]} position={[0, 0.02, 0]}>
      <Pedestal />
      {variant === "man" ? <ManBust /> : <WomanBust />}
    </group>
  );
}

/** 黄铜铭牌底座（带倒角的分层圆台） */
function Pedestal() {
  return (
    <group>
      {/* 底层：外扩倒角 */}
      <mesh position={[0, -1.02, 0]}>
        <cylinderGeometry args={[0.5, 0.58, 0.1, 40]} />
        <meshStandardMaterial {...brassDeepMat} />
      </mesh>
      {/* 中层亮铜环 */}
      <mesh position={[0, -0.955, 0]}>
        <cylinderGeometry args={[0.54, 0.5, 0.035, 40]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>
      {/* 顶层托盘 */}
      <mesh position={[0, -0.915, 0]}>
        <cylinderGeometry args={[0.46, 0.54, 0.05, 40]} />
        <meshStandardMaterial {...brassDeepMat} />
      </mesh>
      {/* 正面铭牌 */}
      <mesh position={[0, -0.975, 0.5]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.26, 0.075, 0.025]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>
    </group>
  );
}

/** 瓷偶脸：圆润头 + 小圆眼 + 胭脂红晕 + 小嘴 */
function DollFace({ headY, headR }: { headY: number; headR: number }) {
  const eyeY = headY + headR * 0.08;
  const eyeZ = headR * 0.86;
  const eyeX = headR * 0.4;
  const cheekY = headY - headR * 0.18;
  const cheekX = headR * 0.58;
  const cheekZ = headR * 0.68;
  return (
    <group>
      {/* 眼睛：小而略扁的深色点 */}
      <mesh position={[-eyeX, eyeY, eyeZ]} scale={[1, 1.15, 0.55]}>
        <sphereGeometry args={[headR * 0.095, 14, 12]} />
        <meshStandardMaterial color={EYE} roughness={0.25} />
      </mesh>
      <mesh position={[eyeX, eyeY, eyeZ]} scale={[1, 1.15, 0.55]}>
        <sphereGeometry args={[headR * 0.095, 14, 12]} />
        <meshStandardMaterial color={EYE} roughness={0.25} />
      </mesh>
      {/* 面颊红晕 */}
      <mesh
        position={[-cheekX, cheekY, cheekZ]}
        rotation={[0, -0.5, 0]}
        scale={[1, 0.7, 0.35]}
      >
        <sphereGeometry args={[headR * 0.13, 14, 12]} />
        <meshStandardMaterial color={BLUSH} roughness={0.55} />
      </mesh>
      <mesh
        position={[cheekX, cheekY, cheekZ]}
        rotation={[0, 0.5, 0]}
        scale={[1, 0.7, 0.35]}
      >
        <sphereGeometry args={[headR * 0.13, 14, 12]} />
        <meshStandardMaterial color={BLUSH} roughness={0.55} />
      </mesh>
      {/* 小嘴 */}
      <mesh
        position={[0, headY - headR * 0.38, headR * 0.88]}
        scale={[1, 0.45, 0.35]}
      >
        <sphereGeometry args={[headR * 0.1, 14, 12]} />
        <meshStandardMaterial color={WAX} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ManBust() {
  const headY = 0.68;
  const headR = 0.3;
  return (
    <group scale={0.94}>
      {/* 墨黑西装躯干（向下收窄的半身像） */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.3, 0.44, 1.06, 28]} />
        <meshStandardMaterial color={SUIT} roughness={0.65} />
      </mesh>
      {/* 圆肩 */}
      <mesh position={[0, 0.14, 0]} scale={[1.5, 0.58, 0.92]}>
        <sphereGeometry args={[0.34, 28, 20]} />
        <meshStandardMaterial color={SUIT} roughness={0.65} />
      </mesh>

      {/* 衬衫前襟 */}
      <mesh position={[0, -0.04, 0.285]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.22, 0.6, 0.06]} />
        <meshStandardMaterial color={SHIRT} roughness={0.5} />
      </mesh>
      {/* 棕色马甲 */}
      <mesh position={[0, -0.32, 0.305]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.26, 0.48, 0.05]} />
        <meshStandardMaterial color={SUIT_SOFT} roughness={0.6} />
      </mesh>
      {/* 马甲领口露出的衬衫三角 */}
      <mesh position={[0, 0.1, 0.325]} rotation={[0.08, 0, Math.PI / 4]}>
        <boxGeometry args={[0.15, 0.15, 0.05]} />
        <meshStandardMaterial color={SHIRT} roughness={0.5} />
      </mesh>
      {/* 领带 */}
      <mesh position={[0, 0.0, 0.355]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.075, 0.26, 0.035]} />
        <meshStandardMaterial color={WAX} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.16, 0.355]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color={WAX} roughness={0.45} />
      </mesh>
      {/* 驳领 */}
      <mesh position={[-0.13, 0.05, 0.3]} rotation={[0.1, 0.25, 0.5]}>
        <boxGeometry args={[0.09, 0.4, 0.035]} />
        <meshStandardMaterial color={SUIT} roughness={0.75} />
      </mesh>
      <mesh position={[0.13, 0.05, 0.3]} rotation={[0.1, -0.25, -0.5]}>
        <boxGeometry args={[0.09, 0.4, 0.035]} />
        <meshStandardMaterial color={SUIT} roughness={0.75} />
      </mesh>
      {/* 黄铜怀表链横过马甲 */}
      <mesh position={[0, -0.26, 0.335]} rotation={[Math.PI / 2.15, 0, 0]}>
        <torusGeometry args={[0.15, 0.011, 8, 32, Math.PI]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>
      <mesh position={[0.15, -0.3, 0.28]}>
        <sphereGeometry args={[0.04, 16, 12]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>

      {/* 颈部与衬衫立领 */}
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.085, 0.105, 0.14, 20]} />
        <meshStandardMaterial {...porcelainMat} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.115, 0.135, 0.07, 20]} />
        <meshStandardMaterial color={SHIRT} roughness={0.5} />
      </mesh>

      {/* 瓷偶头 */}
      <mesh position={[0, headY, 0]}>
        <sphereGeometry args={[headR, 32, 24]} />
        <meshStandardMaterial {...porcelainMat} />
      </mesh>
      <DollFace headY={headY} headR={headR} />

      {/* 整齐侧分发型：主发罩 + 侧分刘海 */}
      <mesh position={[0, headY + 0.07, -0.04]} scale={[1.04, 0.85, 1.04]}>
        <sphereGeometry args={[headR, 32, 24]} />
        <meshStandardMaterial color={HAIR_MAN} roughness={0.7} />
      </mesh>
      <mesh
        position={[-0.08, headY + 0.16, 0.17]}
        rotation={[0.15, 0, 0.35]}
        scale={[1.35, 0.42, 0.6]}
      >
        <sphereGeometry args={[headR * 0.55, 20, 16]} />
        <meshStandardMaterial color={HAIR_MAN} roughness={0.7} />
      </mesh>
      {/* 小巧小胡子（鼻下嘴上） */}
      <mesh position={[0, headY - headR * 0.24, headR * 0.9]} scale={[1, 0.3, 0.4]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color={HAIR_MAN} roughness={0.7} />
      </mesh>

      {/* 高顶礼帽：高帽筒 + 薄宽帽檐 + 黄铜缎带 */}
      <mesh position={[0, 0.96, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.025, 32]} />
        <meshStandardMaterial color={SUIT} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.17, 0]}>
        <cylinderGeometry args={[0.2, 0.235, 0.42, 32]} />
        <meshStandardMaterial color={SUIT} roughness={0.5} />
      </mesh>
      {/* 黄铜帽缎带 */}
      <mesh position={[0, 1.03, 0]}>
        <cylinderGeometry args={[0.245, 0.25, 0.075, 32]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>
      <mesh position={[0, 1.39, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 32]} />
        <meshStandardMaterial color={SUIT} roughness={0.5} />
      </mesh>
    </group>
  );
}

function WomanBust() {
  const headY = 0.64;
  const headR = 0.29;
  const gownGeometry = useMemo(() => {
    const pts = [
      new Vector2(0.001, -0.9),
      new Vector2(0.72, -0.88),
      new Vector2(0.58, -0.56),
      new Vector2(0.4, -0.26),
      new Vector2(0.26, -0.08),
      new Vector2(0.3, 0.06),
      new Vector2(0.26, 0.18),
    ];
    return new LatheGeometry(pts, 36);
  }, []);

  return (
    <group>
      {/* 束腰大摆裙（lathe 曲面，微椭圆压扁） */}
      <mesh geometry={gownGeometry} scale={[1, 1, 0.82]}>
        <meshStandardMaterial color={GOWN} roughness={0.62} side={2} />
      </mesh>
      {/* 裙摆黄铜饰边（收进裙面内） */}
      <mesh position={[0, -0.878, 0]} scale={[1, 1, 0.82]}>
        <torusGeometry args={[0.715, 0.015, 8, 48]} />
        <meshStandardMaterial {...brassDeepMat} />
      </mesh>
      {/* 腰线 */}
      <mesh position={[0, -0.07, 0]} scale={[1, 1, 0.85]}>
        <torusGeometry args={[0.265, 0.018, 8, 32]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>

      {/* 泡泡袖 */}
      <mesh position={[-0.3, 0.14, 0]}>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshStandardMaterial color={GOWN_DARK} roughness={0.65} />
      </mesh>
      <mesh position={[0.3, 0.14, 0]}>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshStandardMaterial color={GOWN_DARK} roughness={0.65} />
      </mesh>

      {/* 颈部 */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.16, 20]} />
        <meshStandardMaterial {...porcelainMat} />
      </mesh>
      {/* 纸白蕾丝领圈 */}
      <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]}>
        <torusGeometry args={[0.15, 0.042, 10, 28]} />
        <meshStandardMaterial color={SHIRT} roughness={0.55} />
      </mesh>
      {/* 胸前黄铜胸针 */}
      <mesh position={[0, 0.1, 0.26]}>
        <sphereGeometry args={[0.042, 16, 12]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>

      {/* 瓷偶头 */}
      <mesh position={[0, headY, 0]}>
        <sphereGeometry args={[headR, 32, 24]} />
        <meshStandardMaterial {...porcelainMat} />
      </mesh>
      <DollFace headY={headY} headR={headR} />

      {/* 盘发：后发罩 */}
      <mesh position={[0, headY + 0.05, -0.04]} scale={[1.05, 0.95, 1.05]}>
        <sphereGeometry args={[headR, 32, 24]} />
        <meshStandardMaterial color={HAIR_WOMAN} roughness={0.68} />
      </mesh>
      {/* 中分刘海 */}
      <mesh position={[-0.09, headY + 0.13, 0.14]} rotation={[0.2, 0, 0.3]} scale={[1.05, 0.5, 0.6]}>
        <sphereGeometry args={[headR * 0.5, 20, 16]} />
        <meshStandardMaterial color={HAIR_WOMAN} roughness={0.68} />
      </mesh>
      <mesh position={[0.09, headY + 0.13, 0.14]} rotation={[0.2, 0, -0.3]} scale={[1.05, 0.5, 0.6]}>
        <sphereGeometry args={[headR * 0.5, 20, 16]} />
        <meshStandardMaterial color={HAIR_WOMAN} roughness={0.68} />
      </mesh>
      {/* 发髻 */}
      <mesh position={[0, headY + 0.24, -0.15]}>
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color={HAIR_WOMAN} roughness={0.68} />
      </mesh>
      {/* 黄铜发簪 */}
      <mesh position={[0, headY + 0.24, -0.15]} rotation={[0, 0, Math.PI / 2.4]}>
        <cylinderGeometry args={[0.011, 0.011, 0.38, 8]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>
      <mesh position={[0.17, headY + 0.3, -0.15]}>
        <sphereGeometry args={[0.022, 12, 10]} />
        <meshStandardMaterial {...brassMat} />
      </mesh>
    </group>
  );
}

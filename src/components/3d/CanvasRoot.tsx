import { Canvas } from "@react-three/fiber";
import { useEffect, useState, type ReactNode } from "react";

interface CanvasRootProps {
  frameloop: "demand" | "always";
  onFailed: () => void;
  children?: ReactNode;
}

export default function CanvasRoot({
  frameloop,
  onFailed,
  children,
}: CanvasRootProps) {
  // Warm-up: render continuously for the first moments after mount. In some
  // compositors a purely demand-driven canvas never lands its first frame;
  // a short always-window guarantees the paint, then we idle.
  const [warm, setWarm] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setWarm(false), 1500);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <Canvas
      frameloop={warm || frameloop === "always" ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 3.2], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
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
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      {children}
    </Canvas>
  );
}

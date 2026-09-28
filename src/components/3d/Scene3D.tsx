import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const LazyCanvasRoot = lazy(() => import("./CanvasRoot"));

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

class RenderBoundary extends Component<
  { fallback: ReactNode; children?: ReactNode },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

export interface Scene3DProps {
  size?: number;
  className?: string;
  /** 静态降级内容：SSR、WebGL 失败、加载中都渲染它。 */
  fallback: ReactNode;
  children?: ReactNode;
  frameloop?: "demand" | "always";
}

/**
 * SSR 安全的 Canvas 封装：服务端与水合前渲染 fallback，
 * 客户端 useEffect 后再 lazy 加载并挂载 Canvas（three 不进 SSR bundle）。
 */
export function Scene3D({
  size = 48,
  className,
  fallback,
  children,
  frameloop = "demand",
}: Scene3DProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gl = true;
    try {
      const c = document.createElement("canvas");
      gl = !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl"))
      );
    } catch {
      gl = false;
    }
    if (!gl) setFailed(true);
    setReady(true);
  }, []);

  return (
    <div
      aria-hidden
      className={className}
      style={{ width: size, height: size, lineHeight: 0 }}
    >
      {ready && !failed ? (
        <RenderBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <LazyCanvasRoot frameloop={frameloop} onFailed={() => setFailed(true)}>
              {children}
            </LazyCanvasRoot>
          </Suspense>
        </RenderBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";

import { Scene } from "./components/Scene";

/**
 * App shell: sets up the WebGL canvas and camera, then defers the heavy scene
 * behind Suspense (shader compilation / instance buffer upload).
 */
export default function App(): JSX.Element {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      camera={{ position: [0, 3.4, 15], fov: 55, near: 0.1, far: 200 }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}

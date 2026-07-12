import { OrbitControls } from "@react-three/drei";

import { BioluminescentField } from "./BioluminescentField";
import { Effects } from "./Effects";

/**
 * Scene graph: a near-black void with fog for depth, the procedural colony,
 * a slowly auto-rotating orbit camera, and the bloom post stack.
 * No lights — the flora is emissive/unlit by design.
 */
export function Scene(): JSX.Element {
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <fog attach="fog" args={["#02030a", 9, 40]} />

      <BioluminescentField />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.45}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI * 0.49}
      />

      <Effects />
    </>
  );
}

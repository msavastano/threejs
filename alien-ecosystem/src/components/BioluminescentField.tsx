import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { CONFIG } from "../config";
import { StalkMaterial, type StalkMaterialImpl } from "../materials/StalkMaterial";

// Touch the material so its `extend({ StalkMaterial })` side-effect runs and
// <stalkMaterial /> is registered before this component mounts.
void StalkMaterial;

/**
 * BioluminescentField
 * A single InstancedMesh rendering CONFIG.count stalks. All per-stalk variation
 * (position, rotation, height, width) lives in the instance matrices; per-stalk
 * colour/pulse identity is carried by an `aId` instanced attribute. No per-stalk
 * meshes are created — everything is one draw call.
 */
export function BioluminescentField(): JSX.Element {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<StalkMaterialImpl>(null);

  // A tapered, low-poly stalk. Unit height with the base at y=0 so the vertex
  // shader can treat position.y directly as a 0..1 "height up the stalk" factor.
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.012, 0.05, 1, 5, 1, false);
    g.translate(0, 0.5, 0);
    return g;
  }, []);

  // Per-instance ids (0..count-1) as an instanced attribute named `aId`.
  const ids = useMemo(() => {
    const arr = new Float32Array(CONFIG.count);
    for (let i = 0; i < CONFIG.count; i++) arr[i] = i;
    return arr;
  }, []);

  // Palette colours as THREE.Color instances (uniform values, not strings).
  const colors = useMemo(
    () => ({
      cyan: new THREE.Color(CONFIG.palette.cyan),
      purple: new THREE.Color(CONFIG.palette.purple),
      green: new THREE.Color(CONFIG.palette.green),
    }),
    [],
  );

  // Scatter the colony across a disc and bake transforms into the instance matrices.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < CONFIG.count; i++) {
      // Uniform-ish disc distribution (sqrt keeps density even toward the edge).
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * CONFIG.areaRadius;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const height =
        CONFIG.minHeight + Math.random() * (CONFIG.maxHeight - CONFIG.minHeight);
      const girth = 0.8 + Math.random() * 1.1;

      dummy.position.set(x, 0, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.18, // slight lean
        Math.random() * Math.PI * 2, // random facing
        (Math.random() - 0.5) * 0.22,
      );
      dummy.scale.set(girth, height, girth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  // Advance the single time uniform; the GPU does the rest for all 12k stalks.
  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uTime = clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, CONFIG.count]}
      frustumCulled={false}
    >
      <instancedBufferAttribute
        attach="geometry-attributes-aId"
        args={[ids, 1]}
      />
      <stalkMaterial
        ref={materialRef}
        attach="material"
        key={StalkMaterial.key}
        uSwayStrength={CONFIG.swayStrength}
        uNoiseScale={CONFIG.noiseScale}
        uPulseSpeed={CONFIG.pulseSpeed}
        uColorCyan={colors.cyan}
        uColorPurple={colors.purple}
        uColorGreen={colors.green}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

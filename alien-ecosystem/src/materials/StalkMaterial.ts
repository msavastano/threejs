import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type MaterialNode } from "@react-three/fiber";

import vertexShader from "../shaders/stalk.vert.glsl";
import fragmentShader from "../shaders/stalk.frag.glsl";
import { CONFIG } from "../config";

/** Uniform surface of the stalk material, used for typing refs and JSX props. */
export interface StalkUniforms {
  uTime: number;
  uSwayStrength: number;
  uNoiseScale: number;
  uPulseSpeed: number;
  uColorCyan: THREE.Color;
  uColorPurple: THREE.Color;
  uColorGreen: THREE.Color;
}

/** Concrete material instance type (ShaderMaterial + our uniforms as fields). */
export type StalkMaterialImpl = THREE.ShaderMaterial & StalkUniforms;

// drei's shaderMaterial wires the GLSL + default uniforms into a ShaderMaterial
// subclass and exposes each uniform as a getter/setter on the instance.
export const StalkMaterial = shaderMaterial(
  {
    uTime: 0,
    uSwayStrength: CONFIG.swayStrength,
    uNoiseScale: CONFIG.noiseScale,
    uPulseSpeed: CONFIG.pulseSpeed,
    uColorCyan: new THREE.Color(CONFIG.palette.cyan),
    uColorPurple: new THREE.Color(CONFIG.palette.purple),
    uColorGreen: new THREE.Color(CONFIG.palette.green),
  } satisfies StalkUniforms,
  vertexShader,
  fragmentShader,
);

// Register as the <stalkMaterial /> JSX element.
extend({ StalkMaterial });

// Strongly type the new intrinsic element for TSX usage (@react-three/fiber v8
// surfaces custom elements through the global JSX.IntrinsicElements namespace).
declare global {
  namespace JSX {
    interface IntrinsicElements {
      stalkMaterial: MaterialNode<StalkMaterialImpl, typeof StalkMaterial>;
    }
  }
}

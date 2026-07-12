import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { useControls } from 'leva'

/**
 * Ocean — professional-grade water surface for R3F.
 *
 * Wraps three.js `Water` (planar-reflection mirror shader) in a declarative
 * component, and extends the stock shader in two ways:
 *
 *  1. Wave direction. The stock Water shader scrolls its noise octaves along
 *     hardcoded axes. We inject a `waveAngle` uniform and rotate the noise-
 *     field UVs in `getNoise()`, giving true directional control without
 *     forking the shader.
 *
 *  2. Status-driven fading. Water exposes an `alpha` uniform; we drive it
 *     with a framerate-independent exponential damp toward the opacity for
 *     the current AI status. When fully faded we set `visible = false`,
 *     which skips Water's onBeforeRender reflection pass — a full extra
 *     scene render you don't want to pay for an invisible ocean.
 */

export type AIStatus = 'active' | 'thinking' | 'idle'

const STATUS_OPACITY: Record<AIStatus, number> = {
  active: 1.0,
  thinking: 0.45,
  idle: 0.0,
}

export interface OceanProps {
  /** Current AI status — drives the fade target. */
  status?: AIStatus
  /** Normalized direction TOWARD the sun (shared with your light/sky). */
  sunDirection: THREE.Vector3
  /** Plane size in world units. */
  size?: number
  /** Fade responsiveness (damping lambda; higher = snappier). */
  fadeLambda?: number
}

// GLSL injected into Water's fragment shader: rotate the noise-field UVs.
const DIRECTION_PATCH_ANCHOR = 'vec4 getNoise( vec2 uv ) {'
const DIRECTION_PATCH = /* glsl */ `
  uniform float waveAngle;

  vec2 rotateUv( vec2 uv, float a ) {
    float c = cos( a );
    float s = sin( a );
    return mat2( c, -s, s, c ) * uv;
  }

  vec4 getNoise( vec2 uv ) {
    uv = rotateUv( uv, waveAngle );
`

export function Ocean({
  status = 'active',
  sunDirection,
  size = 10000,
  fadeLambda = 2.5,
}: OceanProps) {
  // --- Leva: manual fine-tuning -------------------------------------------
  const { waveDirection, waveSpeed, distortionScale, waterColor, sunColor } =
    useControls('Ocean', {
      waveDirection: { value: 35, min: -180, max: 180, step: 1, label: 'direction °' },
      waveSpeed: { value: 0.6, min: 0, max: 3, step: 0.01, label: 'speed' },
      distortionScale: { value: 2.6, min: 0, max: 8, step: 0.05, label: 'distortion' },
      waterColor: { value: '#02141c', label: 'water color' },
      sunColor: { value: '#fff4e0', label: 'sun color' },
    })

  // --- Normal map: soft, rolling, tileable --------------------------------
  const waterNormals = useLoader(THREE.TextureLoader, '/textures/waternormals.png')
  useMemo(() => {
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping
  }, [waterNormals])

  // --- Water object --------------------------------------------------------
  const water = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size)
    const water = new Water(geometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: sunDirection.clone().normalize(),
      sunColor: 0xffffff,
      waterColor: 0x02141c,
      distortionScale: 2.6,
      fog: false,
      alpha: 1.0,
    })
    water.rotation.x = -Math.PI / 2

    // Patch the shader: directional control + transparency.
    const mat = water.material as THREE.ShaderMaterial
    mat.transparent = true
    mat.uniforms.waveAngle = { value: 0 }
    mat.fragmentShader = mat.fragmentShader.replace(
      DIRECTION_PATCH_ANCHOR,
      DIRECTION_PATCH,
    )
    mat.needsUpdate = true

    return water
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, waterNormals])

  useEffect(() => {
    return () => {
      water.geometry.dispose()
      ;(water.material as THREE.ShaderMaterial).dispose()
    }
  }, [water])

  // --- Per-frame updates ----------------------------------------------------
  // Accumulate time ourselves so waveSpeed scales flow rate, not phase
  // (multiplying elapsed time by speed would make the surface "jump"
  // whenever the slider moves).
  const phase = useRef(0)
  const opacity = useRef(STATUS_OPACITY[status])

  useFrame((_, delta) => {
    const mat = water.material as THREE.ShaderMaterial

    phase.current += delta * waveSpeed
    mat.uniforms.time.value = phase.current
    mat.uniforms.waveAngle.value = THREE.MathUtils.degToRad(waveDirection)
    mat.uniforms.distortionScale.value = distortionScale
    ;(mat.uniforms.waterColor.value as THREE.Color).set(waterColor)
    ;(mat.uniforms.sunColor.value as THREE.Color).set(sunColor)
    ;(mat.uniforms.sunDirection.value as THREE.Vector3)
      .copy(sunDirection)
      .normalize()

    // Status-driven fade (framerate-independent).
    opacity.current = THREE.MathUtils.damp(
      opacity.current,
      STATUS_OPACITY[status],
      fadeLambda,
      delta,
    )
    mat.uniforms.alpha.value = opacity.current

    // Fully faded: skip the planar-reflection render pass entirely.
    water.visible = opacity.current > 0.005
  })

  return <primitive object={water} />
}

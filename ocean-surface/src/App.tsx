import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { Ocean, type AIStatus } from './components/Ocean'

/** Something floating on the surface so reflections have a subject. */
function Buoy() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) {
      ref.current.position.y = 1.2 + Math.sin(t * 0.8) * 0.6
      ref.current.rotation.z = Math.sin(t * 0.5) * 0.08
      ref.current.rotation.x = Math.cos(t * 0.6) * 0.06
    }
  })
  return (
    <group ref={ref} position={[0, 1.2, -30]}>
      <mesh castShadow>
        <icosahedronGeometry args={[4, 1]} />
        <meshStandardMaterial color="#ff5a36" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 6]} />
        <meshStandardMaterial color="#dddddd" roughness={0.5} />
      </mesh>
      <pointLight position={[0, 9, 0]} intensity={20} color="#ffcc66" />
    </group>
  )
}

function Scene() {
  // Sun position — shared by sky, light, and water reflection.
  const { elevation, azimuth } = useControls('Sun', {
    elevation: { value: 6, min: 0.5, max: 89, step: 0.1, label: 'elevation °' },
    azimuth: { value: 180, min: -180, max: 180, step: 1, label: 'azimuth °' },
  })

  // Simulated AI status — in your app, pass real agent state instead.
  const { status } = useControls('AI Status', {
    status: {
      value: 'active' as AIStatus,
      options: ['active', 'thinking', 'idle'] as AIStatus[],
    },
  })

  const sunDirection = useMemo(() => {
    const phi = THREE.MathUtils.degToRad(90 - elevation)
    const theta = THREE.MathUtils.degToRad(azimuth)
    return new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
  }, [elevation, azimuth])

  const sunPosition = useMemo(
    () => sunDirection.clone().multiplyScalar(1000),
    [sunDirection],
  )

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={sunPosition}
        turbidity={8}
        rayleigh={2.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.85}
      />

      {/* The "Sun": its reflection on the surface comes from the water
          shader's specular term (sunDirection/sunColor uniforms); this
          directional light lits everything else in the scene. */}
      <directionalLight
        position={sunPosition}
        intensity={2.2}
        color="#fff2dd"
      />
      <ambientLight intensity={0.25} color="#88aacc" />

      <Suspense fallback={null}>
        <Ocean status={status} sunDirection={sunDirection} />
      </Suspense>

      <Buoy />

      <OrbitControls
        target={[0, 6, -20]}
        maxPolarAngle={Math.PI * 0.495}
        minDistance={15}
        maxDistance={400}
        enableDamping
      />
    </>
  )
}

export default function App() {
  return (
    <>
      <Leva titleBar={{ title: 'Ocean Controls' }} />
      <Canvas
        camera={{ position: [0, 14, 80], fov: 55, near: 1, far: 20000 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.7 }}
      >
        <Scene />
      </Canvas>
    </>
  )
}

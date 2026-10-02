import * as THREE from 'three';
import { FlightMode } from './types';
import { soundManager } from './SoundManager';

export class FlightController {
  public mode: FlightMode = 'specimen';
  public targetPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public currentPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public currentRot: THREE.Euler = new THREE.Euler(0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Flight path parameters
  private flightTime: number = 0;
  private flightRadius: number = 3.8;
  private flightHeight: number = 1.4;

  // Gust disturbance reaction
  public gustIntensity: number = 0;

  // Mouse tracking in flight mode
  public mouseWorldTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public useMouseFollow: boolean = false;

  constructor() {
    this.currentPos.set(0, 0, 0);
  }

  public setMode(mode: FlightMode) {
    this.mode = mode;
    if (mode === 'flight') {
      soundManager.playFlutter();
    }
  }

  public triggerGust() {
    this.gustIntensity = 1.0;
    soundManager.playFlutter();
  }

  public update(delta: number, butterflyGroup: THREE.Group): { glideRatio: number; speedMultiplier: number } {
    let glideRatio = 0.0;
    let speedMultiplier = 1.0;

    // Dampen gust
    if (this.gustIntensity > 0) {
      this.gustIntensity = Math.max(0, this.gustIntensity - delta * 1.5);
    }

    if (this.mode === 'specimen') {
      // Smoothly return to center specimen position
      this.targetPos.set(0, 0, 0);
      this.currentPos.lerp(this.targetPos, delta * 3.0);

      // Level out orientation with slight hovering sway
      const hoverRoll = Math.sin(performance.now() * 0.001) * 0.05 + this.gustIntensity * 0.3;
      const hoverPitch = Math.cos(performance.now() * 0.0015) * 0.03 - this.gustIntensity * 0.2;

      this.currentRot.set(hoverPitch, 0, hoverRoll);
      butterflyGroup.position.copy(this.currentPos);
      butterflyGroup.rotation.copy(this.currentRot);

      return { glideRatio: 0.0, speedMultiplier: 1.0 + this.gustIntensity * 2 };
    }

    if (this.mode === 'flight') {
      this.flightTime += delta * 0.65;

      if (this.useMouseFollow) {
        // Follow mouse pointer in 3D
        this.targetPos.copy(this.mouseWorldTarget);
        this.targetPos.y += Math.sin(this.flightTime * 2) * 0.4;
      } else {
        // Splendid 3D Lissajous / Figure-8 swoop flight path
        const t = this.flightTime;
        const x = Math.sin(t) * this.flightRadius;
        const z = Math.sin(t * 2) * (this.flightRadius * 0.65);
        const y = Math.sin(t * 1.5) * this.flightHeight + 0.5;
        this.targetPos.set(x, y, z);
      }

      // Smooth steering toward target
      const prevPos = this.currentPos.clone();
      this.currentPos.lerp(this.targetPos, delta * 2.2);

      // Calculate directional vector & velocity
      this.velocity.subVectors(this.currentPos, prevPos).divideScalar(delta || 0.016);
      const speed = this.velocity.length();

      // Heading orientation: face along flight velocity
      if (speed > 0.1) {
        const targetRotY = Math.atan2(this.velocity.x, this.velocity.z);

        // Banking roll proportional to turn rate
        const turnRate = Math.cos(this.flightTime * 2);
        const targetRoll = -turnRate * 0.45;

        // Pitch proportional to climb/dive
        const targetPitch = Math.max(-0.6, Math.min(0.6, -this.velocity.y * 0.5));

        butterflyGroup.rotation.y = THREE.MathUtils.lerp(butterflyGroup.rotation.y, targetRotY, delta * 3.5);
        butterflyGroup.rotation.z = THREE.MathUtils.lerp(butterflyGroup.rotation.z, targetRoll, delta * 3.5);
        butterflyGroup.rotation.x = THREE.MathUtils.lerp(butterflyGroup.rotation.x, targetPitch, delta * 3.5);

        // If diving downward with high speed, transition to graceful glide!
        if (this.velocity.y < -0.3 && speed > 1.2) {
          glideRatio = 0.8;
          speedMultiplier = 0.4;
        } else if (this.velocity.y > 0.2) {
          // Climbing: flap faster
          speedMultiplier = 1.4;
        }
      }

      butterflyGroup.position.copy(this.currentPos);
      return { glideRatio, speedMultiplier: speedMultiplier + this.gustIntensity * 1.5 };
    }

    if (this.mode === 'orbit_cinematic') {
      this.targetPos.set(0, Math.sin(performance.now() * 0.001) * 0.1, 0);
      this.currentPos.lerp(this.targetPos, delta * 2.0);
      butterflyGroup.position.copy(this.currentPos);

      // Slow specimen rotation
      butterflyGroup.rotation.y += delta * 0.4;
      butterflyGroup.rotation.x = Math.sin(performance.now() * 0.0012) * 0.08;
      butterflyGroup.rotation.z = 0;

      return { glideRatio: 0.0, speedMultiplier: 1.0 };
    }

    return { glideRatio: 0.0, speedMultiplier: 1.0 };
  }
}

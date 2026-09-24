import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * CharacterController
 *
 * Loads a rigged GLTF character (with 'Idle', 'Walk', 'Run' clips),
 * enables shadows on every mesh, and cross-fades between animations.
 *
 * Usage:
 *   const character = new CharacterController(scene);
 *   await character.load('/models/character.glb');
 *
 *   // In the render loop:
 *   const delta = clock.getDelta();
 *   character.update(delta);
 *   renderer.render(scene, camera);
 *
 *   // Anywhere (input handling, AI, etc.):
 *   character.transitionTo('Run', 0.25);
 */
export class CharacterController {
  constructor(scene) {
    this.scene = scene;
    this.model = null;
    this.mixer = null;
    this.actions = {};       // clip name -> THREE.AnimationAction
    this.currentAction = null;
  }

  /**
   * Load the GLTF model, set up shadows and the AnimationMixer.
   * Starts the 'Idle' clip automatically if it exists.
   */
  async load(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);

    this.model = gltf.scene;
    this.scene.add(this.model);

    // Enable shadows on every mesh in the rig.
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Skinned meshes can pop out of the shadow camera frustum.
        if (child.isSkinnedMesh) child.frustumCulled = false;
      }
    });

    // Build one AnimationAction per clip.
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    }

    if (this.actions['Idle']) {
      this.currentAction = this.actions['Idle'];
      this.currentAction.play();
    }

    return this;
  }

  /**
   * Smoothly cross-fade from the active clip to another one.
   * @param {string} actionName  e.g. 'Idle', 'Walk', 'Run'
   * @param {number} duration    fade time in seconds
   */
  transitionTo(actionName, duration = 0.3) {
    const next = this.actions[actionName];
    if (!next || next === this.currentAction) return;

    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.reset();
    next.play();

    if (this.currentAction) {
      // Fades current out and next in simultaneously.
      this.currentAction.crossFadeTo(next, duration, false);
    } else {
      next.fadeIn(duration);
    }

    this.currentAction = next;
  }

  /**
   * Advance the animation mixer. Call once per frame with the
   * frame delta time, e.g. from THREE.Clock.getDelta().
   */
  update(delta) {
    if (this.mixer) this.mixer.update(delta);
  }
}

// 🛵 The food courier: walks across your roulette table (in 3D, in the same style as Dave and
// you) with your order. If Dave is standing on the table, there's a decent chance he eats it.

import * as THREE from 'three';
import { buildAvatar, disposeAvatar } from './avatar.js';

const FRONT_Z = 3.3; // the strip of felt between the wheel and you
const START = new THREE.Vector3(-13, 0.8, FRONT_Z);
const HANDOFF = new THREE.Vector3(-3.1, 0.8, FRONT_Z);
const EXIT = new THREE.Vector3(13, 0.8, FRONT_Z);

function buildCourier() {
  const c = buildAvatar({ skin: '#c68642', hair: 'short', hairColor: '#1c120c', facial: 'stubble', face: 'grin', shirt: '#2e8b3e', top: 'tshirt', hat: 'cap', glasses: null, neck: null });
  // the big insulated backpack, with the logo
  const logo = document.createElement('canvas');
  logo.width = 128;
  logo.height = 128;
  const x = logo.getContext('2d');
  x.fillStyle = '#1aa37a';
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#fff';
  x.font = 'bold 44px Arial, sans-serif';
  x.textAlign = 'center';
  x.fillText('GG', 64, 64);
  x.font = 'bold 20px Arial, sans-serif';
  x.fillText('GrubGrab', 64, 100);
  const tex = new THREE.CanvasTexture(logo);
  tex.colorSpace = THREE.SRGBColorSpace;
  const green = new THREE.MeshStandardMaterial({ color: 0x1aa37a, roughness: 0.6 });
  const branded = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  // box faces: +x, -x, +y, -y, +z, -z. He walks side-on, so the logo goes on the sides.
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.6), [branded, branded, green, green, green, green]);
  bag.position.set(0, 0.9, -0.62);
  c.body.add(bag);
  // your food, in a paper bag, in his hand
  const food = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.22), new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.9 }));
  food.position.set(0, -1.12, 0.1);
  c.armR.g.add(food);
  c.food = food;
  c.root.scale.setScalar(0.8);
  return c;
}

/**
 * @param wheel  the roulette wheel (its scene, camera, per-frame hook)
 * @param dave   Dave, who may intercept the order
 */
export function createCourier({ wheel, dave }) {
  let c = null;
  let job = null;
  const tmp = new THREE.Vector3();

  function screenPoint(yUp = 1.2) {
    c.root.getWorldPosition(tmp);
    tmp.y += yUp;
    tmp.project(wheel.camera);
    const r = wheel.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((tmp.x + 1) / 2) * r.width, y: r.top + ((1 - tmp.y) / 2) * r.height };
  }

  /**
   * Walk the order in. onArrive(point) when he hands it over; onStolen() if Dave takes it.
   * Returns false if he can't walk (another delivery is on the way).
   */
  function deliver({ foodName, onArrive, onStolen }) {
    if (job) return false;
    c = buildCourier();
    c.root.position.copy(START);
    wheel.scene.add(c.root);
    const steal = dave.here() && Math.random() < 0.5;
    job = { phase: 'in', t: 0, foodName, onArrive, onStolen, steal, stolen: false };
    return true;
  }

  wheel.onFrame((dt, t) => {
    if (!job) return;
    job.t += dt;
    const p = c.root.position;
    let walking = true;
    if (job.phase === 'in') {
      const k = Math.min(1, job.t / 4.2);
      p.lerpVectors(START, HANDOFF, k);
      // Dave reaches down from the table as he walks past
      if (job.steal && !job.stolen && p.x > -6.2) {
        job.stolen = true;
        c.food.visible = false;
        dave.snatch(job.foodName);
      }
      if (k >= 1) {
        job.phase = 'hand';
        job.t = 0;
        if (job.stolen) job.onStolen?.();
        else job.onArrive?.(screenPoint());
        c.food.visible = false;
      }
    } else if (job.phase === 'hand') {
      walking = false;
      if (job.t > 1.6) {
        job.phase = 'out';
        job.t = 0;
      }
    } else {
      const k = Math.min(1, job.t / 4.5);
      p.lerpVectors(HANDOFF, EXIT, k * k);
      if (k >= 1) {
        disposeAvatar(c);
        c = null;
        job = null;
        return;
      }
    }
    // walk cycle (same stride as Dave, fewer beers)
    const stride = walking ? Math.sin(t * 8) * 0.5 : 0;
    c.legs[0].rotation.x = stride;
    c.legs[1].rotation.x = -stride;
    c.body.position.y = walking ? Math.abs(Math.sin(t * 8)) * 0.08 : 0;
    c.root.rotation.y = walking ? Math.PI / 2 : 0; // side-on while walking, faces you to hand it over
    // hand-over: arm out towards you, then a shrug if Dave ate it
    if (job.phase === 'hand') {
      c.armR.g.rotation.set(-1.3, 0, 0);
      c.armL.g.rotation.set(job.stolen ? -0.3 : 0, 0, job.stolen ? -1.2 : -0.1);
      if (job.stolen) c.armR.g.rotation.set(-0.3, 0, 1.2); // shrug
    } else {
      c.armR.g.rotation.set(-0.35, 0, 0.1); // carrying the bag
      c.armL.g.rotation.set(-stride * 0.6, 0, -0.1);
    }
  });

  return { deliver, busy: () => !!job };
}

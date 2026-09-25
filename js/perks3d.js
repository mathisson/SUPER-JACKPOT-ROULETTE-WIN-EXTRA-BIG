// 🎩🐋 Level perks you can see: the high-roller table (red velvet felt, brass posts and velvet
// ropes around the wheel) and whale mode (an inflatable whale bobbing over the table).

import * as THREE from 'three';

const TABLE_Y = -0.42; // the felt, as in scenery.js

function velvetRopes() {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.22 });
  const velvet = new THREE.MeshStandardMaterial({ color: 0x8a0f24, roughness: 0.75 });
  const N = 10;
  const R = 5.35;
  const tops = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / N;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    const post = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 24), brass);
    base.position.y = 0.035;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 12), brass);
    pole.position.y = 0.5;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), brass);
    knob.position.y = 1.0;
    post.add(base, pole, knob);
    post.position.set(x, TABLE_Y, z);
    post.traverse((o) => o.isMesh && (o.castShadow = true));
    g.add(post);
    tops.push(new THREE.Vector3(x, TABLE_Y + 0.93, z));
  }
  // a sagging velvet rope between each pair (leave a gap at the front for you to get in)
  for (let i = 0; i < N; i++) {
    const a = tops[i];
    const b = tops[(i + 1) % N];
    if (a.z > 3 && b.z > 3) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= 0.3;
    const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.6).setY(mid.y + 0.08), mid, b.clone().lerp(mid, 0.6).setY(mid.y + 0.08), b]);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 8), velvet);
    rope.castShadow = true;
    g.add(rope);
  }
  return g;
}

function inflatableWhale() {
  const g = new THREE.Group();
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x3aa7ff, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 });
  const belly = new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.2, clearcoat: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), blue);
  body.scale.set(1.6, 1, 1.05);
  g.add(body);
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), belly);
  tummy.scale.set(1.58, 0.98, 1.03);
  g.add(tummy);
  // the tail: a tapering stalk and two flukes
  const stalk = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 20), blue);
  stalk.rotation.z = Math.PI / 2 + 0.35;
  stalk.position.set(-1.9, 0.35, 0);
  g.add(stalk);
  for (const side of [-1, 1]) {
    const fluke = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), blue);
    fluke.scale.set(0.35, 0.12, 1);
    fluke.position.set(-2.45, 0.62, side * 0.45);
    fluke.rotation.y = side * 0.5;
    g.add(fluke);
  }
  // fins
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10), blue);
    fin.scale.set(0.8, 0.15, 0.45);
    fin.position.set(0.35, -0.45, side * 1.0);
    fin.rotation.x = side * 0.5;
    g.add(fin);
  }
  // eyes, a smile, and a spout of water drops
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), white);
    eye.position.set(1.18, 0.28, side * 0.62);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), black);
    pupil.position.set(1.3, 0.3, side * 0.68);
    g.add(eye, pupil);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 8, 20, Math.PI * 0.8), black);
  smile.position.set(1.5, -0.12, 0);
  smile.rotation.set(0, Math.PI / 2, Math.PI + 0.35 * Math.PI);
  g.add(smile);
  const drops = new THREE.Group();
  const water = new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, roughness: 0, transmission: 0.6, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), water);
    d.userData.phase = i / 9;
    drops.add(d);
  }
  drops.position.set(0.5, 0.95, 0);
  g.add(drops);
  g.userData.drops = drops;
  // a gold "$" on the side, because it's that kind of whale
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffd23f';
  x.font = 'bold 110px Georgia, serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('$', 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false }));
    decal.position.set(-0.2, 0.05, side * 1.06);
    decal.rotation.y = side > 0 ? 0 : Math.PI;
    g.add(decal);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

/**
 * Hang the perk décor in the roulette scene.
 * @returns { set({ highroller, whale }) }
 */
export function createPerkDecor(wheel) {
  let ropes = null;
  let whale = null;
  wheel.onFrame((dt, t) => {
    if (!whale) return;
    // bob and drift around the back of the table
    const a = t * 0.18;
    whale.position.set(Math.sin(a) * 6, 1.1 + Math.sin(t * 1.3) * 0.2, -5.4 + Math.cos(a) * 0.4); // behind the wheel, never over it
    whale.rotation.y = -a + Math.PI / 2 + Math.PI;
    whale.rotation.z = Math.sin(t * 1.3) * 0.08;
    whale.userData.drops.children.forEach((d) => {
      const p = (t * 0.8 + d.userData.phase) % 1;
      const ang = d.userData.phase * Math.PI * 2;
      d.position.set(Math.cos(ang) * p * 0.5, Math.sin(p * Math.PI) * 0.9, Math.sin(ang) * p * 0.5);
      d.scale.setScalar(1 - p * 0.6);
    });
  });
  return {
    set({ highroller, whale: whaleOn }) {
      wheel.scenery.setFelt?.(highroller ? 'highroller' : 'classic');
      if (highroller && !ropes) wheel.scene.add((ropes = velvetRopes()));
      if (ropes) ropes.visible = !!highroller;
      if (whaleOn && !whale) {
        whale = inflatableWhale();
        whale.scale.setScalar(0.7);
        wheel.scene.add(whale);
      }
      if (whale) whale.visible = !!whaleOn;
    },
  };
}

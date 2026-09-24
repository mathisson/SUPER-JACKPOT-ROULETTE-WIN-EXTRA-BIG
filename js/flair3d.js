// ✨ Your win style, in 3D: when you win, a burst of hearts, rubber chickens, tiny Daves, dollar
// bills or fireworks flies out over the classic celebration. One transparent layer on top,
// only rendering while something is flying.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- the little things that fly ----------
function heart() {
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.bezierCurveTo(1.3, -0.2, 1.2, 1, 0.5, 1);
  s.bezierCurveTo(0.2, 1, 0, 0.7, 0, 0.5);
  s.bezierCurveTo(0, 0.7, -0.2, 1, -0.5, 1);
  s.bezierCurveTo(-1.2, 1, -1.3, -0.2, 0, -1);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3 });
  geo.center();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: [0xff2d6a, 0xff5fa2, 0xe0142c][(Math.random() * 3) | 0], roughness: 0.3, metalness: 0.1 }));
}

function chicken() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), yellow);
  body.scale.set(1, 0.8, 1.3);
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), yellow);
  head.position.set(0, 1, 0.8);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xff7a1a }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.95, 1.35);
  g.add(beak);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xe0142c }));
  comb.position.set(0, 1.55, 0.75);
  g.add(comb);
  return g;
}

function daveHead() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.6 })));
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xc0182a }));
  band.rotation.x = Math.PI / 2 - 0.2;
  band.position.y = 0.45;
  g.add(band);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const x of [-0.35, 0.35]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), dark);
    eye.position.set(x, 0.18, 0.93);
    g.add(eye);
  }
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7a1d1d }));
  grin.rotation.z = Math.PI;
  grin.position.set(0, -0.3, 0.9);
  g.add(grin);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0706a }));
  nose.position.set(0, -0.02, 1);
  g.add(nose);
  return g;
}

let billTex = null;
function bill() {
  billTex ??= (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 110;
    const x = c.getContext('2d');
    x.fillStyle = '#85bb65';
    x.fillRect(0, 0, 256, 110);
    x.strokeStyle = '#2e5a1c';
    x.lineWidth = 6;
    x.strokeRect(6, 6, 244, 98);
    x.fillStyle = '#2e5a1c';
    x.beginPath();
    x.arc(128, 55, 30, 0, 7);
    x.fill();
    x.fillStyle = '#85bb65';
    x.font = 'bold 44px Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('$', 128, 57);
    x.fillStyle = '#2e5a1c';
    x.font = 'bold 26px Georgia, serif';
    x.fillText('100', 40, 30);
    x.fillText('100', 216, 82);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  return new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.03), new THREE.MeshStandardMaterial({ map: billTex, side: THREE.DoubleSide, roughness: 0.8 }));
}

export function createFlair() {
  let renderer = null;
  let scene = null;
  let camera = null;
  let env = null;
  const bits = [];
  const sparks = [];
  let running = false;
  let last = 0;

  function ensure() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const el = renderer.domElement;
    el.className = 'flair-layer';
    document.body.appendChild(el);
    scene = new THREE.Scene();
    env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.3, 0.8, 1);
    scene.add(key);
    // an orthographic camera measured in screen pixels, so bursts start exactly where the win is
    camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
    resize();
    addEventListener('resize', resize);
  }
  function resize() {
    if (!renderer) return;
    renderer.setSize(innerWidth, innerHeight);
    camera.right = innerWidth;
    camera.bottom = -innerHeight;
    camera.updateProjectionMatrix();
  }

  function spawn(mesh, x, y, v, size, life, spin = 6) {
    mesh.scale.multiplyScalar(size);
    mesh.position.set(x, -y, 0);
    mesh.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    scene.add(mesh);
    bits.push({ mesh, v, spin: new THREE.Vector3(rand(-spin, spin), rand(-spin, spin), rand(-spin, spin)), life, max: life });
  }

  function firework(x, y, color) {
    const n = 90;
    const pos = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([x, -y, 0], i * 3);
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 380);
      vel.push([Math.cos(a) * sp, Math.sin(a) * sp]);
    }
    const pts = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ color, size: 7, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(pts);
    sparks.push({ pts, vel, life: 1.6 });
  }

  /** Throw a burst of your style from (x, y) on screen. level 0..3 = WIN .. JACKPOT. */
  function burst(style, { x = innerWidth / 2, y = innerHeight * 0.4 } = {}, level = 1) {
    ensure();
    const n = 14 + level * 10;
    if (style === 'fireworks') {
      const cols = [0xff2d9a, 0x2de0ff, 0xffd23f, 0x5ee08f, 0xb066ff];
      for (let i = 0; i < 3 + level * 2; i++) {
        setTimeout(() => firework(rand(innerWidth * 0.15, innerWidth * 0.85), rand(innerHeight * 0.12, innerHeight * 0.5), cols[i % cols.length]), i * 260);
      }
    } else if (style === 'money') {
      // it's raining money, from the top of the screen
      for (let i = 0; i < n + 10; i++) spawn(bill(), rand(0, innerWidth), rand(-200, -30), new THREE.Vector3(rand(-40, 40), rand(-60, -20), 0), rand(18, 26), rand(3, 4.5), 3);
    } else {
      const make = { heartsfx: heart, chickens: chicken, daves: daveHead }[style];
      if (!make) return;
      for (let i = 0; i < n; i++) {
        const a = rand(Math.PI * 0.15, Math.PI * 0.85);
        const sp = rand(380, 820);
        spawn(make(), x, y, new THREE.Vector3(Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), Math.sin(a) * sp, 0), rand(14, 24), rand(2.2, 3.2));
      }
    }
    if (!running) {
      running = true;
      last = performance.now();
      renderer.setAnimationLoop(frame);
    }
  }

  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life -= dt;
      const isBill = b.mesh.geometry?.type === 'PlaneGeometry';
      if (isBill) {
        // flutter down
        b.v.x += Math.sin(now / 300 + i) * 30 * dt;
        b.mesh.position.x += b.v.x * dt;
        b.mesh.position.y += b.v.y * dt - 40 * dt;
      } else {
        b.v.y -= 900 * dt; // gravity (screen pixels)
        b.mesh.position.addScaledVector(b.v, dt);
      }
      b.mesh.rotation.x += b.spin.x * dt;
      b.mesh.rotation.y += b.spin.y * dt;
      b.mesh.rotation.z += b.spin.z * dt;
      const fade = Math.min(1, b.life / 0.6);
      b.mesh.traverse((o) => {
        if (!o.material) return;
        o.material.transparent = true;
        o.material.opacity = fade;
      });
      if (b.life <= 0 || b.mesh.position.y < -innerHeight - 200) {
        scene.remove(b.mesh);
        b.mesh.traverse((o) => {
          o.geometry?.dispose();
          if (o.material && o.material.map !== billTex) o.material.dispose();
        });
        bits.splice(i, 1);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      const p = s.pts.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) {
        s.vel[k][1] -= 220 * dt;
        p.setXY(k, p.getX(k) + s.vel[k][0] * dt, p.getY(k) + s.vel[k][1] * dt);
      }
      p.needsUpdate = true;
      s.pts.material.opacity = Math.max(0, s.life / 1.6);
      if (s.life <= 0) {
        scene.remove(s.pts);
        s.pts.geometry.dispose();
        s.pts.material.dispose();
        sparks.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
    if (!bits.length && !sparks.length) {
      running = false;
      renderer.setAnimationLoop(null);
      renderer.clear();
    }
  }

  return { burst };
}

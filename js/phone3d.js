// 📱 The phone, in 3D: a proper handset that rises into view and tilts as you move. Its screen is
// real HTML (Three.js CSS3DRenderer), so the apps are clickable. Plus the selfie camera scene.

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildAvatar, animateAvatar, disposeAvatar } from './avatar.js';
import { buildDave } from './dave.js';
import { caseMaterial, caseExtras } from './skins.js';

const PHONE_W = 2.1;
const PHONE_H = 4.3;
export const SCREEN_PX = { w: 380, h: 800 };
const SCREEN_W = 1.92; // world units the HTML screen covers
const PX = SCREEN_W / SCREEN_PX.w;
const ease = (t) => 1 - (1 - t) ** 3;

export class PhoneOverlay {
  /** container: full-screen layer. screenEl: the phone's HTML screen (380×800 px). skin: the case you bought. */
  constructor(container, screenEl, { skin = 'graphite' } = {}) {
    this.container = container;
    const gl = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    gl.setPixelRatio(Math.min(devicePixelRatio, 2));
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.domElement.className = 'ph-gl';
    container.appendChild(gl.domElement);
    const css = (this.css = new CSS3DRenderer());
    css.domElement.className = 'ph-css';
    container.appendChild(css.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(gl);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2, 4, 6);
    this.scene.add(key);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // the handset: graphite body, glossy black glass, buttons down the side
    const phone = (this.phone = new THREE.Group());
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(PHONE_W, PHONE_H, 0.24, 6, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x2b2d33, metalness: 0.85, roughness: 0.3 })
    );
    phone.add(body);
    const glass = new THREE.Mesh(
      new RoundedBoxGeometry(PHONE_W - 0.08, PHONE_H - 0.08, 0.02, 4, 0.24),
      new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.05, clearcoat: 1, metalness: 0.2 })
    );
    glass.position.z = 0.118;
    phone.add(glass);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.9, roughness: 0.3 });
    for (const [x, y, h] of [[PHONE_W / 2 + 0.01, 0.9, 0.5], [-PHONE_W / 2 - 0.01, 1.1, 0.3], [-PHONE_W / 2 - 0.01, 0.6, 0.5]]) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.05, h, 0.1, 2, 0.02), btnMat);
      b.position.set(x, y, 0);
      phone.add(b);
    }
    // the case: a slightly bigger shell behind the phone, so its rim shows all round the screen
    const cm = caseMaterial(skin);
    if (cm) {
      const shell = new THREE.Mesh(new RoundedBoxGeometry(PHONE_W + 0.16, PHONE_H + 0.16, 0.3, 6, 0.34), cm);
      shell.position.z = -0.04;
      phone.add(shell);
    }
    this.extras = caseExtras(skin, PHONE_W + 0.16, PHONE_H + 0.16);
    phone.add(this.extras);
    // the HTML screen, floating just above the glass
    this.screen = new CSS3DObject(screenEl);
    this.screen.scale.setScalar(PX);
    this.screen.position.z = 0.13;
    phone.add(this.screen);
    this.scene.add(phone);

    this.pointer = { x: 0, y: 0 };
    this.onMove = (e) => {
      this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener('pointermove', this.onMove);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    this.anim = null;
    this.shown = 0;
    this.buzz = 0;
    gl.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.css.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // distance so the phone fills ~88% of the height, or the width on narrow screens
    const f = h / 2 / Math.tan((this.camera.fov * Math.PI) / 360);
    this.dist = Math.max((PHONE_H * f) / (h * 0.88), (PHONE_W * f) / (w * 0.9));
    this.camera.position.set(0, 0, this.dist);
    this.camera.lookAt(0, 0, 0);
    // on wide screens it sits to the right, like you're holding it
    const shiftPx = w > 900 ? w * 0.2 : 0;
    this.restX = (shiftPx * this.dist) / f;
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    if (this.anim) {
      this.anim.t = Math.min(1, this.anim.t + dt / this.anim.dur);
      this.shown = this.anim.to ? ease(this.anim.t) : 1 - ease(this.anim.t);
      if (this.anim.t >= 1) {
        const done = this.anim.done;
        this.anim = null;
        done?.();
      }
    }
    const k = this.shown;
    const p = this.phone;
    // rises from below, turning to face you; tilts a little with the mouse
    p.position.set(this.restX + (1 - k) * 0.6, -(1 - k) * 9 + Math.sin(t * 1.3) * 0.02, 0);
    p.rotation.set((1 - k) * 0.9 + this.pointer.y * 0.06, (1 - k) * -0.5 + this.pointer.x * 0.08, (1 - k) * 0.25);
    // the Dave keychain swings
    const dangle = this.extras.userData.dangle;
    if (dangle) dangle.rotation.z = Math.sin(t * 2.2) * 0.35 + (this.buzz > 0 ? Math.sin(t * 40) * 0.3 : 0);
    if (this.buzz > 0) {
      this.buzz -= dt;
      p.position.x += Math.sin(t * 90) * 0.02;
      p.rotation.z += Math.sin(t * 70) * 0.01;
    }
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.scene, this.camera);
  }

  open(done) {
    this.anim = { t: 0, dur: 0.55, to: 1, done };
  }
  close(done) {
    this.anim = { t: 0, dur: 0.4, to: 0, done };
  }
  vibrate() {
    this.buzz = 0.4;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    removeEventListener('pointermove', this.onMove);
    this.ro.disconnect();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => m.dispose());
    });
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.container.replaceChildren();
  }
}

// ---------- the front camera: you, the casino behind you, maybe Dave ----------
export class SelfieCam {
  /** canvas: where the viewfinder draws. drunk: 0..4. dave: photobomb? emote: your pose. */
  constructor(canvas, { look, drunk = 0, dave = false, emote = 'wave' }) {
    this.emote = emote;
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(canvas.clientWidth, canvas.clientHeight, false);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    this.drunk = drunk;

    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x12060a);
    const pmrem = new THREE.PMREMGenerator(r);
    this.env = s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // so gold looks gold
    pmrem.dispose();
    s.add(new THREE.HemisphereLight(0xffe8f0, 0x200a10, 0.8));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.7);
    key.position.set(1, 3, 4);
    s.add(key);
    const pink = new THREE.PointLight(0xff5aa0, 12, 10, 1.5);
    pink.position.set(-2, 3, -1);
    s.add(pink);

    // the casino behind you: slot machines and out-of-focus lights
    const cols = [0xff2d9a, 0x2de0ff, 0xffd23f, 0xb066ff, 0x5ee08f];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.5 }));
      m.position.set(-5 + i * 1.25, 1.1, -6);
      s.add(m);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }));
      screen.position.set(m.position.x, 1.6, -5.59);
      s.add(screen);
    }
    const bokehTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    for (let i = 0; i < 26; i++) {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: bokehTex, color: cols[i % cols.length], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      b.position.set(-6 + Math.random() * 12, 0.5 + Math.random() * 5, -4.5 - Math.random() * 2);
      b.scale.setScalar(0.6 + Math.random() * 1.2);
      s.add(b);
    }

    this.me = buildAvatar(look);
    s.add(this.me.root);
    if (dave) {
      this.dave = buildDave();
      this.dave.root.position.set(-1.25, -0.25, -1.3);
      this.dave.root.rotation.y = 0.5;
      s.add(this.dave.root);
    }
    // make it rain: bills tumbling down all around you (only for that emote)
    const billTex = (() => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 56;
      const x = c.getContext('2d');
      x.fillStyle = '#85bb65';
      x.fillRect(0, 0, 128, 56);
      x.strokeStyle = '#2e5a1c';
      x.lineWidth = 4;
      x.strokeRect(3, 3, 122, 50);
      x.fillStyle = '#2e5a1c';
      x.font = 'bold 30px Georgia, serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('$', 64, 30);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    this.bills = new THREE.Group();
    for (let i = 0; i < 34; i++) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.15), new THREE.MeshStandardMaterial({ map: billTex, side: THREE.DoubleSide, roughness: 0.8 }));
      b.userData = { x: -1.4 + Math.random() * 2.8, z: -0.8 + Math.random() * 1.8, speed: 0.4 + Math.random() * 0.5, phase: Math.random() * 10, spin: 1 + Math.random() * 3 };
      this.bills.add(b);
    }
    s.add(this.bills);
    this.camera = new THREE.PerspectiveCamera(52, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this.frame());
  }

  setEmote(id) {
    this.emote = id;
  }

  setLook(look) {
    disposeAvatar(this.me);
    this.me = buildAvatar(look);
    this.scene.add(this.me.root);
  }

  frame() {
    const t = this.clock.getElapsedTime();
    animateAvatar(this.me, t, { pose: 'selfie', emote: this.emote });
    this.bills.visible = this.emote === 'moneyrain';
    if (this.bills.visible) {
      for (const b of this.bills.children) {
        const u = b.userData;
        const y = 3.4 - ((t * u.speed + u.phase) % 3.2);
        b.position.set(u.x + Math.sin(t * 1.5 + u.phase) * 0.15, y, u.z);
        b.rotation.set(t * u.spin, t * u.spin * 0.7, Math.sin(t + u.phase));
      }
    }
    if (this.dave) {
      // photobomb: leans in, pulls a face, peace sign
      this.dave.body.rotation.z = -0.3 + Math.sin(t * 2) * 0.08;
      this.dave.armR.g.rotation.set(-2.8 + Math.sin(t * 5) * 0.2, 0, 0.3);
      this.dave.head.rotation.z = Math.sin(t * 1.7) * 0.2;
    }
    // arm's-length camera, with a drunk wobble
    const d = this.drunk;
    this.camera.position.set(0.35 + Math.sin(t * 1.1) * 0.05 * d, 2.15 + Math.sin(t * 0.9) * 0.04 * d, 2.35);
    this.camera.lookAt(0, 1.85, 0);
    this.camera.rotateZ(-0.08 + Math.sin(t * 0.7) * 0.05 * d);
    this.renderer.render(this.scene, this.camera);
  }

  /** Take the photo: the frame, plus drunk double vision and stickers. Returns a JPEG data URL. */
  snap({ caption = '', drunk = this.drunk } = {}) {
    this.frame();
    const src = this.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = Math.round((360 * src.height) / src.width);
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0, c.width, c.height);
    if (drunk >= 2) {
      // double vision
      x.globalAlpha = 0.35 + drunk * 0.05;
      x.drawImage(src, 8 + drunk * 3, 2, c.width, c.height);
      x.globalAlpha = 1;
    }
    x.font = 'bold 20px Inter, Arial, sans-serif';
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(0, c.height - 38, c.width, 38);
    x.fillStyle = '#ffe9a8';
    x.fillText(caption, 12, c.height - 13);
    return c.toDataURL('image/jpeg', 0.82);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    disposeAvatar(this.me);
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    });
    this.env?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}

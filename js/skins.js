// 📱 Phone cases, wallpapers and ringtones: shared by the 3D phone, the phone in your hand on
// the turntable, and the store. (Their store entries live in avatar.js with everything else.)

import * as THREE from 'three';

// ---------- cases ----------
const tex = (draw, w = 256, h = 512) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** The material for a phone case (null = the bare graphite phone, no case). */
export function caseMaterial(id) {
  switch (id) {
    case 'gold':
      return new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.2 });
    case 'diamond':
      return new THREE.MeshPhysicalMaterial({ color: 0xe8eef5, metalness: 0.9, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 });
    case 'leopard':
      return new THREE.MeshStandardMaterial({
        roughness: 0.8,
        map: tex((x, w, h) => {
          x.fillStyle = '#d9a441';
          x.fillRect(0, 0, w, h);
          for (let i = 0; i < 90; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const r = 6 + Math.random() * 8;
            x.fillStyle = '#3a220f';
            x.beginPath();
            x.ellipse(cx, cy, r, r * 0.8, Math.random() * 3, 0, 7);
            x.fill();
            x.fillStyle = '#8a5a2b';
            x.beginPath();
            x.ellipse(cx, cy, r * 0.5, r * 0.4, 0, 0, 7);
            x.fill();
          }
        }),
      });
    case 'banana':
      return new THREE.MeshStandardMaterial({ color: 0xffd93b, roughness: 0.55 });
    case 'neon':
      return new THREE.MeshStandardMaterial({ color: 0xff2d9a, emissive: 0xff2d9a, emissiveIntensity: 0.9, roughness: 0.4 });
    case 'dave':
      return new THREE.MeshStandardMaterial({ color: 0xc0182a, roughness: 0.5 });
    case 'cracked':
    default:
      return null;
  }
}

/** Extra bits on some cases: gems round the diamond one, banana ends, Dave dangling off the corner. */
export function caseExtras(id, w, h) {
  const g = new THREE.Group();
  if (id === 'diamond') {
    const gem = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transmission: 0.6, iridescence: 1, clearcoat: 1 });
    const geo = new THREE.OctahedronGeometry(0.045);
    for (let i = 0; i < 44; i++) {
      const t = i / 44;
      // walk round the rim
      const perim = 2 * (w + h);
      let d = t * perim;
      let x, y;
      if (d < w) (x = -w / 2 + d), (y = h / 2);
      else if ((d -= w) < h) (x = w / 2), (y = h / 2 - d);
      else if ((d -= h) < w) (x = w / 2 - d), (y = -h / 2);
      else (d -= w), (x = -w / 2), (y = -h / 2 + d);
      const m = new THREE.Mesh(geo, gem);
      m.position.set(x, y, 0.16);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.add(m);
    }
  } else if (id === 'banana') {
    const brown = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.35, 10), brown);
    stem.position.set(0.2, h / 2 + 0.15, -0.02);
    stem.rotation.z = -0.4;
    g.add(stem);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), brown);
    tip.position.set(-0.2, -h / 2 - 0.02, -0.02);
    g.add(tip);
  } else if (id === 'dave') {
    // a little Dave-head keychain hanging off the top corner
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), new THREE.MeshStandardMaterial({ color: 0xcfd4d8, metalness: 1, roughness: 0.3 }));
    chain.position.set(w / 2 + 0.02, h / 2 + 0.02, 0);
    g.add(chain);
    const head = new THREE.Group();
    head.position.set(w / 2 + 0.1, h / 2 - 0.18, 0.05);
    const skin = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.6 }));
    head.add(skin);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xc0182a }));
    band.rotation.x = Math.PI / 2 - 0.2;
    band.position.y = 0.06;
    head.add(band);
    const grin = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7a1d1d }));
    grin.rotation.z = Math.PI;
    grin.position.set(0, -0.04, 0.14);
    head.add(grin);
    g.add(head);
    g.userData.dangle = head;
  }
  return g;
}

// ---------- wallpapers (CSS for the real phone screen, canvas for little 3D phones) ----------
export const WALLPAPERS = {
  neon: {
    css: 'radial-gradient(circle at 20% 15%, rgba(255,45,154,0.55), transparent 55%), radial-gradient(circle at 85% 80%, rgba(45,224,255,0.45), transparent 55%), linear-gradient(160deg, #2a0e3a, #0b0b1a)',
    colors: ['#2a0e3a', '#ff2d9a', '#2de0ff'],
  },
  jackpot: { css: 'repeating-linear-gradient(135deg, rgba(255,210,63,0.15) 0 18px, transparent 18px 36px), radial-gradient(circle at 50% 35%, #c0182a, #3a0610 70%)', colors: ['#3a0610', '#c0182a', '#ffd23f'], text: '777' },
  sunset: { css: 'linear-gradient(180deg, #ff7a59 0%, #ff4f8b 40%, #6b2d8f 75%, #1a1040 100%)', colors: ['#ff7a59', '#ff4f8b', '#6b2d8f'] },
  space: { css: 'radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(2px 2px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent), radial-gradient(circle at 70% 25%, #3a4bd8, transparent 40%), #05051a', colors: ['#05051a', '#3a4bd8', '#ffffff'] },
  money: { css: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 40px), linear-gradient(160deg, #1f7a3a, #0c3d1c)', colors: ['#0c3d1c', '#1f7a3a', '#c8f7c5'], text: '$$$' },
  dave: { css: null, colors: ['#c0182a', '#f1c27d', '#1a0a0a'], text: 'DAVE' },
  selfie: { css: null, colors: ['#222', '#555', '#999'], text: '📸' },
};

/** A small canvas version of a wallpaper, for the phone in your hand on the turntable. */
export function wallpaperTexture(id) {
  const wp = WALLPAPERS[id] || WALLPAPERS.neon;
  return tex((x, w, h) => {
    const g = x.createLinearGradient(0, 0, w * 0.4, h);
    wp.colors.forEach((c, i) => g.addColorStop(i / (wp.colors.length - 1), c));
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.font = 'bold 54px Arial, sans-serif';
    x.textAlign = 'center';
    x.fillText('9:41', w / 2, 110);
    if (wp.text) {
      x.font = 'bold 60px Arial, sans-serif';
      x.fillText(wp.text, w / 2, h * 0.62);
    }
  });
}

// ---------- ringtones (what Dave's texts sound like) ----------
/** Play a ringtone through the game's sound. */
export function playRingtone(sound, id) {
  const b = (f, d, type, v, at) => sound.blip(f, d, type, v, at);
  switch (id) {
    case 'jackpot': // DING DING DING, like the slots
      [0, 0.16, 0.32].forEach((t) => {
        b(2093, 0.22, 'triangle', 0.12, t);
        b(3136, 0.12, 'sine', 0.05, t);
      });
      for (let i = 0; i < 6; i++) b(2600 + Math.random() * 900, 0.06, 'sine', 0.04, 0.5 + i * 0.05);
      break;
    case 'airhorn': // three blasts
      [0, 0.28, 0.56].forEach((t, i) => {
        const len = i === 2 ? 0.5 : 0.2;
        b(349, len, 'sawtooth', 0.09, t);
        b(440, len, 'sawtooth', 0.07, t);
        b(523, len, 'sawtooth', 0.06, t);
      });
      break;
    case 'orchestra': // a tiny fanfare
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, t]) => b(f, t === 0.38 ? 0.6 : 0.14, 'triangle', 0.12, t));
      b(131, 0.9, 'sine', 0.12, 0);
      b(196, 0.6, 'sine', 0.08, 0.38);
      break;
    case 'quack':
      [0, 0.22].forEach((t) => [620, 520, 430].forEach((f, i) => b(f, 0.06, 'square', 0.07, t + i * 0.04)));
      break;
    case 'retro': // 8-bit arpeggio
      [523, 659, 784, 1047, 1319].forEach((f, i) => b(f, 0.07, 'square', 0.06, i * 0.06));
      break;
    default: // the original chime
      [1318.5, 1975.5, 2637].forEach((f, i) => {
        b(f, 0.16, 'triangle', 0.11, i * 0.085);
        b(f * 2, 0.06, 'sine', 0.03, i * 0.085);
      });
  }
}

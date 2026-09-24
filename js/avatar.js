// 🧑 YOU, in 3D: a character built exactly like Dave (same chunky shapes, same materials),
// customisable in Settings, with a store full of hats and bling to spend your winnings on.

import * as THREE from 'three';
import { Stage3D } from './kitchen3d.js';

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- what you can change for free ----------
export const BASE = {
  skin: ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'],
  hair: [
    ['bald', 'Bald'],
    ['short', 'Short'],
    ['spiky', 'Spiky'],
    ['long', 'Long'],
    ['afro', 'Afro'],
    ['mohawk', 'Mohawk'],
    ['bun', 'Bun'],
  ],
  hairColor: ['#1c120c', '#6b4423', '#b5651d', '#e8c46a', '#d9d9d9', '#c0182a', '#2de0ff'],
  facial: [
    ['none', 'None'],
    ['stubble', 'Stubble'],
    ['mustache', 'Mustache'],
    ['beard', 'Beard'],
  ],
  face: [
    ['grin', '😁 Grin'],
    ['smirk', '😏 Smirk'],
    ['shock', '😮 Shocked'],
    ['cool', '😌 Cool'],
  ],
  shirt: ['#dce8f6', '#1f1f24', '#c0182a', '#2e8b3e', '#2d5aa8', '#ff9ad0'],
};

// ---------- the store ----------
// slot: which part of you it goes on. price 0 = you start with it.
export const CATALOG = [
  { id: 'tshirt', slot: 'top', name: 'T-shirt', emoji: '👕', price: 0 },
  { id: 'hawaiian', slot: 'top', name: 'Hawaiian Shirt', emoji: '🌺', price: 200 },
  { id: 'tux', slot: 'top', name: 'Tuxedo', emoji: '🤵', price: 1500 },
  { id: 'sequin', slot: 'top', name: 'Sequin Jacket', emoji: '🪩', price: 2500 },
  { id: 'goldsuit', slot: 'top', name: 'Solid Gold Suit', emoji: '🥇', price: 25000 },

  { id: 'party', slot: 'hat', name: 'Party Hat', emoji: '🎉', price: 50 },
  { id: 'cone', slot: 'hat', name: 'Traffic Cone', emoji: '🚧', price: 100, note: 'From the hotel room. Nobody asked.' },
  { id: 'cap', slot: 'hat', name: 'Lucky Cap', emoji: '🧢', price: 120 },
  { id: 'chef', slot: 'hat', name: 'Chef Hat', emoji: '👨‍🍳', price: 150, note: 'Earned in the kitchen. Or bought.' },
  { id: 'cowboy', slot: 'hat', name: 'Cowboy Hat', emoji: '🤠', price: 250 },
  { id: 'tophat', slot: 'hat', name: 'Top Hat', emoji: '🎩', price: 500 },
  { id: 'davetie', slot: 'hat', name: "Dave's Tie", emoji: '👔', price: 777, note: 'Worn round the head. As Dave intended.' },
  { id: 'crown', slot: 'hat', name: 'High Roller Crown', emoji: '👑', price: 5000 },

  { id: 'aviators', slot: 'glasses', name: 'Aviators', emoji: '😎', price: 120 },
  { id: 'shutters', slot: 'glasses', name: 'Shutter Shades', emoji: '🕶️', price: 300 },
  { id: 'hearts', slot: 'glasses', name: 'Heart Glasses', emoji: '😍', price: 400 },
  { id: 'monocle', slot: 'glasses', name: 'Monocle', emoji: '🧐', price: 800 },

  { id: 'lei', slot: 'neck', name: 'Flower Lei', emoji: '🌸', price: 60 },
  { id: 'bowtie', slot: 'neck', name: 'Bow Tie', emoji: '🎀', price: 80 },
  { id: 'chain', slot: 'neck', name: 'Gold Chain', emoji: '⛓️', price: 1000 },
];
export const SLOTS = [
  ['top', '👕 Outfit'],
  ['hat', '🎩 Hat'],
  ['glasses', '😎 Glasses'],
  ['neck', '⛓️ Neck'],
];

export const DEFAULT_LOOK = {
  skin: '#f1c27d',
  hair: 'short',
  hairColor: '#6b4423',
  facial: 'none',
  face: 'grin',
  shirt: '#2d5aa8',
  top: 'tshirt',
  hat: null,
  glasses: null,
  neck: null,
};

// ---------- the model (same build as Dave: root at the waist, feet on the floor at -1.46) ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });

function patternTexture(draw, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function topMaterial(look) {
  switch (look.top) {
    case 'hawaiian':
      return new THREE.MeshStandardMaterial({
        roughness: 0.8,
        map: patternTexture((x, n) => {
          x.fillStyle = '#1aa3a3';
          x.fillRect(0, 0, n, n);
          const cols = ['#ff5fa2', '#ffd23f', '#ff7a1a', '#ffffff'];
          for (let i = 0; i < 14; i++) {
            const cx = Math.random() * n;
            const cy = Math.random() * n;
            x.fillStyle = cols[i % cols.length];
            for (let p = 0; p < 5; p++) {
              const a = (p / 5) * Math.PI * 2;
              x.beginPath();
              x.arc(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 6, 0, 7);
              x.fill();
            }
            x.fillStyle = '#ffd23f';
            x.beginPath();
            x.arc(cx, cy, 4, 0, 7);
            x.fill();
          }
          x.strokeStyle = '#0d6b3a';
          x.lineWidth = 4;
          for (let i = 0; i < 6; i++) {
            x.beginPath();
            x.moveTo(Math.random() * n, Math.random() * n);
            x.quadraticCurveTo(Math.random() * n, Math.random() * n, Math.random() * n, Math.random() * n);
            x.stroke();
          }
        }),
      });
    case 'tux':
      return mat(0x16161a, { roughness: 0.45 });
    case 'sequin':
      return new THREE.MeshStandardMaterial({
        color: 0xb066ff,
        metalness: 0.6,
        roughness: 0.3,
        map: patternTexture((x, n) => {
          x.fillStyle = '#b066ff';
          x.fillRect(0, 0, n, n);
          for (let i = 0; i < 260; i++) {
            x.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`;
            x.beginPath();
            x.arc(Math.random() * n, Math.random() * n, 1.6, 0, 7);
            x.fill();
          }
        }),
      });
    case 'goldsuit':
      return new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.22 });
    default:
      return mat(look.shirt);
  }
}

function buildHair(look, head) {
  const m = mat(look.hairColor, { roughness: 0.9 });
  const add = (mesh) => head.add(mesh) && mesh;
  switch (look.hair) {
    case 'short': {
      const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.445, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), m));
      cap.rotation.x = -0.25;
      break;
    }
    case 'spiky':
      for (let i = 0; i < 11; i++) {
        const spike = add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 6), m));
        const a = (i / 11) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22 - 0.04);
        spike.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.35), m)).rotation.x = -0.2;
      break;
    case 'long': {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.455, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), m)).rotation.x = -0.3;
      const back = add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.85, 0.22), m));
      back.position.set(0, -0.3, -0.28);
      break;
    }
    case 'afro':
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        if (Math.sin(a) > 0.45) continue; // keep the face clear
        const puff = add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), m));
        const up = i % 2 ? 0.35 : 0.2;
        puff.position.set(Math.cos(a) * 0.38, up, Math.sin(a) * 0.38 - 0.05);
      }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), m)).position.set(0, 0.42, -0.05);
      break;
    case 'mohawk':
      for (let i = 0; i < 6; i++) {
        const fin = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 5), m));
        fin.position.set(0, 0.38 + Math.sin((i / 5) * Math.PI) * 0.06, 0.25 - i * 0.12);
        fin.rotation.x = -0.4 + i * 0.16;
      }
      break;
    case 'bun': {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.445, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), m)).rotation.x = -0.25;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), m)).position.set(0, 0.5, -0.16);
      break;
    }
  }
}

function buildFace(look, head) {
  const dark = mat(0x1a1a1a, { roughness: 0.5 });
  const lip = mat(0x7a1d1d);
  const brow = mat(look.hairColor, { roughness: 0.9 });
  const eye = (x, round) => {
    const e = new THREE.Mesh(round ? new THREE.SphereGeometry(0.055, 10, 8) : new THREE.BoxGeometry(0.12, 0.028, 0.02), dark);
    e.position.set(x, 0.08, 0.39);
    head.add(e);
    return e;
  };
  const browAt = (x, y, rz) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.03), brow);
    b.position.set(x, y, 0.39);
    b.rotation.z = rz;
    head.add(b);
  };
  const mouth = (arc, rz, x = 0, r = 0.13) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 20, arc), lip);
    g.rotation.z = rz;
    g.position.set(x, -0.14, 0.38);
    head.add(g);
  };
  switch (look.face) {
    case 'smirk':
      eye(-0.15, true);
      eye(0.15, true);
      browAt(-0.15, 0.2, 0.1);
      browAt(0.15, 0.25, 0.35); // one eyebrow up
      mouth(Math.PI * 0.6, Math.PI * 1.15, 0.05, 0.11);
      break;
    case 'shock':
      eye(-0.15, true).scale.setScalar(1.4);
      eye(0.15, true).scale.setScalar(1.4);
      browAt(-0.15, 0.25, -0.1);
      browAt(0.15, 0.25, 0.1);
      mouth(Math.PI * 2, 0, 0, 0.07);
      break;
    case 'cool':
      eye(-0.15, false);
      eye(0.15, false);
      mouth(Math.PI * 0.7, Math.PI * 1.15, 0, 0.1);
      break;
    default:
      eye(-0.15, true);
      eye(0.15, true);
      browAt(-0.15, 0.2, 0.05);
      browAt(0.15, 0.2, -0.05);
      mouth(Math.PI, Math.PI);
  }
  // a nose and ears, like Dave's (minus the drinking)
  const skinDark = mat(new THREE.Color(look.skin).multiplyScalar(0.88));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skinDark);
  nose.position.set(0, -0.02, 0.41);
  head.add(nose);
  for (const x of [-0.42, 0.42]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skinDark);
    ear.scale.set(0.6, 1, 0.8);
    ear.position.set(x, 0, 0);
    head.add(ear);
  }
}

function buildFacialHair(look, head) {
  const m = mat(look.hairColor, { roughness: 0.95 });
  if (look.facial === 'stubble') {
    const shell = new THREE.Mesh(
      // phi = PI/2 faces +z (the front), so this shell covers the jaw and chin
      new THREE.SphereGeometry(0.427, 24, 12, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.3),
      new THREE.MeshStandardMaterial({ color: look.hairColor, transparent: true, opacity: 0.35, roughness: 1 })
    );
    head.add(shell);
  } else if (look.facial === 'mustache') {
    // the waiter's magnificent curl, in homage
    for (const side of [-1, 1]) {
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 8, 16, Math.PI * 1.3), m);
      curl.position.set(side * 0.09, -0.07, 0.41);
      curl.rotation.set(0, 0, side > 0 ? Math.PI * 1.1 : -Math.PI * 0.4);
      head.add(curl);
    }
  } else if (look.facial === 'beard') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 14, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.4), m);
    beard.scale.set(1, 1.05, 1.02);
    beard.position.z = 0.02;
    head.add(beard);
  }
}

function buildHat(id, head) {
  if (!id) return;
  const g = new THREE.Group();
  g.position.y = 0.34;
  head.add(g);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.25 });
  switch (id) {
    case 'party': {
      const tex = patternTexture((x, n) => {
        for (let i = 0; i < 8; i++) {
          x.fillStyle = i % 2 ? '#ff5fa2' : '#ffd23f';
          x.fillRect((i * n) / 8, 0, n / 8, n);
        }
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      cone.position.y = 0.3;
      cone.rotation.z = 0.2;
      g.add(cone);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xffffff));
      pom.position.set(-0.055, 0.57, 0);
      g.add(pom);
      break;
    }
    case 'cone': {
      const orange = mat(0xff6a13, { roughness: 0.6 });
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 24), orange);
      c.position.y = 0.42;
      g.add(c);
      for (const y of [0.3, 0.52]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * (1 - y / 0.8) + 0.02, 0.3 * (1 - (y - 0.08) / 0.8) + 0.02, 0.08, 24, 1, true), mat(0xffffff, { roughness: 0.4 }));
        band.position.y = y;
        g.add(band);
      }
      break;
    }
    case 'cap': {
      const red = mat(0xc0182a, { roughness: 0.7 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), red);
      dome.position.y = -0.1;
      g.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24, 1, false, -Math.PI / 2, Math.PI), red);
      brim.position.set(0, 0.02, 0.32);
      brim.scale.z = 1.2;
      g.add(brim);
      break;
    }
    case 'chef': {
      const white = mat(0xffffff, { roughness: 0.9 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.22, 24), white);
      band.position.y = 0.05;
      g.add(band);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), white);
        puff.position.set(Math.cos(a) * 0.2, 0.35, Math.sin(a) * 0.2);
        g.add(puff);
      }
      g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), white), { position: new THREE.Vector3(0, 0.45, 0) }));
      break;
    }
    case 'cowboy': {
      const brown = mat(0x8a5a2b, { roughness: 0.8 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.04, 32), brown);
      brim.scale.z = 0.8;
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.4, 24), brown);
      crown.position.y = 0.2;
      g.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.07, 24, 1, true), mat(0x2a1a0c));
      band.position.y = 0.05;
      g.add(band);
      break;
    }
    case 'tophat': {
      const black = mat(0x111114, { roughness: 0.4 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32), black);
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 28), black);
      crown.position.y = 0.32;
      g.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.1, 28, 1, true), mat(0xc0182a));
      band.position.y = 0.08;
      g.add(band);
      break;
    }
    case 'davetie': {
      // exactly the way Dave wears it
      g.position.y = 0;
      const red = mat(0xc0182a, { roughness: 0.6 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 8, 32), red);
      band.rotation.x = Math.PI / 2 - 0.2;
      band.position.y = 0.2;
      g.add(band);
      for (const [dz, rz] of [[0, 0.5], [0.08, 0.8]]) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.03), red);
        tail.position.set(0.44, 0.02, -0.08 + dz);
        tail.rotation.z = rz;
        g.add(tail);
      }
      break;
    }
    case 'crown': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.2, 28, 1, true), gold);
      ring.material = gold.clone();
      ring.material.side = THREE.DoubleSide;
      ring.position.y = 0.05;
      g.add(ring);
      const gems = [0xc0182a, 0x2d5aa8, 0x2e8b3e];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), gold);
        spike.position.set(Math.cos(a) * 0.35, 0.24, Math.sin(a) * 0.35);
        g.add(spike);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat(gems[i % 3], { roughness: 0.1, metalness: 0.3 }));
        gem.position.set(Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.36);
        g.add(gem);
      }
      break;
    }
  }
}

function buildGlasses(id, head) {
  if (!id) return;
  const g = new THREE.Group();
  g.position.set(0, 0.08, 0.4);
  head.add(g);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.25 });
  if (id === 'aviators' || id === 'hearts') {
    const lensMat = id === 'hearts' ? mat(0xff3d8a, { roughness: 0.2, transparent: true, opacity: 0.9 }) : mat(0x111111, { roughness: 0.1, metalness: 0.5 });
    for (const x of [-0.16, 0.16]) {
      const lens = new THREE.Mesh(id === 'hearts' ? heartGeo() : new THREE.SphereGeometry(0.12, 16, 12), lensMat);
      if (id !== 'hearts') lens.scale.set(1, 0.8, 0.25);
      lens.position.x = x;
      g.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), id === 'hearts' ? lensMat : gold);
    g.add(bridge);
  } else if (id === 'shutters') {
    const white = mat(0xffffff, { roughness: 0.5 });
    for (let i = 0; i < 5; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.025, 0.03), white);
      slat.position.y = 0.08 - i * 0.04;
      g.add(slat);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.01), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
    frame.position.set(0, 0, -0.01);
    g.add(frame);
  } else if (id === 'monocle') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), gold);
    ring.position.x = 0.15;
    g.add(ring);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 6), gold);
    chain.position.set(0.24, -0.3, -0.05);
    chain.rotation.z = 0.3;
    g.add(chain);
  }
}

function heartGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.1);
  s.bezierCurveTo(0.13, -0.02, 0.12, 0.1, 0.05, 0.1);
  s.bezierCurveTo(0.02, 0.1, 0, 0.07, 0, 0.05);
  s.bezierCurveTo(0, 0.07, -0.02, 0.1, -0.05, 0.1);
  s.bezierCurveTo(-0.12, 0.1, -0.13, -0.02, 0, -0.1);
  return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
}

function buildNeck(id, body) {
  if (!id) return;
  const g = new THREE.Group();
  g.position.set(0, 1.45, 0.08);
  body.add(g);
  if (id === 'chain') {
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.2 });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32), gold);
    chain.rotation.x = Math.PI / 2 + 0.5;
    chain.position.set(0, -0.12, 0);
    g.add(chain);
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), gold);
    medal.rotation.x = Math.PI / 2;
    medal.position.set(0, -0.38, 0.34);
    g.add(medal);
  } else if (id === 'bowtie') {
    const red = mat(0xc0182a, { roughness: 0.5 });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), red);
      wing.rotation.z = (side * Math.PI) / 2;
      wing.position.set(side * 0.09, 0, 0.36);
      g.add(wing);
    }
    g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), red), { position: new THREE.Vector3(0, 0, 0.38) }));
  } else if (id === 'lei') {
    const cols = [0xff5fa2, 0xffd23f, 0xff7a1a, 0xffffff, 0xb066ff];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(cols[i % cols.length]));
      f.position.set(Math.cos(a) * 0.36, -0.1 - Math.max(0, Math.sin(a)) * 0.18, Math.sin(a) * 0.3); // droops at the front
      g.add(f);
    }
  }
}

/**
 * Build your character. Same skeleton as Dave: { root, body, head, armL, armR, legs }.
 * The root sits at the waist; feet are 1.46 below it (times the scale).
 */
export function buildAvatar(look = DEFAULT_LOOK) {
  const skin = mat(look.skin, { roughness: 0.65 });
  const top = topMaterial(look);
  const pantsCol = { tux: 0x16161a, goldsuit: 0xe8c35a, sequin: 0x241034 }[look.top] ?? 0x2f4a78;
  const pants = look.top === 'goldsuit' ? new THREE.MeshStandardMaterial({ color: pantsCol, metalness: 1, roughness: 0.25 }) : mat(pantsCol, { roughness: 0.8 });
  const shoe = mat(look.top === 'tux' ? 0x0a0a0a : 0xf4f4f4, { roughness: 0.5 });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legs = [-0.24, 0.24].map((x) => {
    const g = new THREE.Group();
    g.position.x = x;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 1.45, 12), pants);
    leg.position.y = -0.72;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.46), shoe);
    foot.position.set(0, -1.46, 0.09);
    g.add(foot);
    root.add(g);
    return g;
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.8, 6, 16), top);
  torso.scale.set(1, 1, 0.78);
  torso.position.y = 0.72;
  body.add(torso);
  if (look.top === 'tux' || look.top === 'goldsuit' || look.top === 'sequin') {
    // shirt front and lapels
    const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 3), mat(0xffffff, { roughness: 0.6 }));
    shirt.rotation.x = Math.PI;
    shirt.position.set(0, 1.12, 0.36);
    shirt.scale.z = 0.3;
    body.add(shirt);
    if (look.top === 'tux' && !look.neck) {
      const bow = mat(0x111111);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), bow);
        wing.rotation.z = (side * Math.PI) / 2;
        wing.position.set(side * 0.07, 1.42, 0.44);
        body.add(wing);
      }
    }
  } else if (look.top === 'tshirt') {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), mat(new THREE.Color(look.shirt).multiplyScalar(0.8)));
    collar.rotation.x = Math.PI / 2 + 0.3;
    collar.position.set(0, 1.45, 0.05);
    body.add(collar);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.25, 12), skin);
  neck.position.y = 1.55;
  body.add(neck);

  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.62, 1.3, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.75, 4, 10), top);
    upper.position.y = -0.45;
    g.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), skin);
    hand.position.y = -0.95;
    g.add(hand);
    body.add(g);
    return { g, hand };
  };
  const armL = arm(-1);
  const armR = arm(1);

  const head = new THREE.Group();
  head.position.y = 1.95;
  body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), skin));
  buildFace(look, head);
  buildHair(look, head);
  buildFacialHair(look, head);
  buildHat(look.hat, head);
  buildGlasses(look.glasses, head);
  buildNeck(look.neck, body);

  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return { root, body, head, armL, armR, legs };
}

/** Throw a character away (geometries, materials, textures). */
export function disposeAvatar(a) {
  a?.root.traverse((o) => {
    o.geometry?.dispose();
    [].concat(o.material || []).forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
  });
  a?.root.removeFromParent();
}

/** Idle life: breathe, look around, the odd little bounce. */
export function animateAvatar(a, t, { pose = 'idle' } = {}) {
  a.body.position.y = Math.sin(t * 2) * 0.02;
  a.body.rotation.z = Math.sin(t * 0.9) * 0.03;
  a.head.rotation.y = Math.sin(t * 0.6) * 0.25;
  a.head.rotation.x = Math.sin(t * 0.8) * 0.05;
  if (pose === 'selfie') {
    a.armR.g.rotation.set(-1.35, 0, 0.85); // arm out to the side, holding the phone (out of shot)
    a.armL.g.rotation.set(0.1, 0, -0.1 + Math.sin(t * 3) * 0.3); // a little wave
  } else {
    a.armL.g.rotation.set(Math.sin(t * 1.3) * 0.08, 0, -0.12);
    a.armR.g.rotation.set(-Math.sin(t * 1.3) * 0.08, 0, 0.12);
  }
}

// ---------- the dressing room: your character on a turntable ----------
export class AvatarStage extends Stage3D {
  constructor(container, look) {
    super(container, 32);
    const s = this.scene;
    s.background = new THREE.Color(0x14070c);
    s.fog = new THREE.Fog(0x14070c, 12, 30);
    s.add(new THREE.HemisphereLight(0xffe8f0, 0x1a0808, 0.55));
    const key = new THREE.SpotLight(0xfff0dd, 90, 20, 0.5, 0.5, 1.2);
    key.position.set(2.5, 7, 5);
    key.target.position.set(0, 0.6, 0);
    s.add(key, key.target);
    const rim = new THREE.PointLight(0xff5aa0, 25, 12, 1.5);
    rim.position.set(-3, 3, -3);
    s.add(rim);
    const rim2 = new THREE.PointLight(0x2de0ff, 18, 12, 1.5);
    rim2.position.set(3, 2, -3);
    s.add(rim2);

    // velvet curtains behind, a gold-trimmed turntable underfoot
    const curtainTex = (() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 64;
      const x = c.getContext('2d');
      for (let i = 0; i < 256; i++) {
        const v = 0.55 + Math.sin(i * 0.25) * 0.3;
        x.fillStyle = `rgb(${Math.round(120 * v)}, ${Math.round(12 * v)}, ${Math.round(30 * v)})`;
        x.fillRect(i, 0, 1, 64);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.x = 3;
      return t;
    })();
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 12, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ map: curtainTex, side: THREE.BackSide, roughness: 0.9 }));
    curtain.position.y = 4;
    s.add(curtain);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: 0x1a0b10, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.3;
    s.add(floor);
    this.table = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0x2a0d14, roughness: 0.4 }));
    disc.position.y = -1.2;
    this.table.add(disc);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.05, 8, 64), new THREE.MeshStandardMaterial({ color: 0xe8c35a, metalness: 1, roughness: 0.25 }));
    trim.rotation.x = Math.PI / 2;
    trim.position.y = -1.1;
    this.table.add(trim);
    s.add(this.table);
    // sparkles drifting through the spotlight
    const n = 120;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([rand(-4, 4), rand(-1, 5), rand(-3, 2)], i * 3);
    this.sparkles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ color: 0xffe9a8, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    s.add(this.sparkles);

    this.spin = 0.5;
    this.drag = null;
    this.setLook(look);
    this.camera.position.set(0, 1.6, 9.4); // room above the head for a top hat
    this.camera.lookAt(0, 1.0, 0);

    // drag to spin it yourself
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, spin: this.spin };
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', (e) => {
      if (this.drag) this.spin = this.drag.spin + (e.clientX - this.drag.x) * 0.012;
    });
    const up = () => {
      this.drag = null;
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  setLook(look) {
    disposeAvatar(this.avatar);
    this.avatar = buildAvatar(look);
    this.avatar.root.position.y = 0.18; // feet on the turntable
    this.table.add(this.avatar.root);
    this.pop = 0.35; // a little hop when something changes
  }

  update(dt, t) {
    if (!this.drag) this.spin += dt * 0.35;
    this.table.rotation.y = this.spin;
    animateAvatar(this.avatar, t);
    if (this.pop > 0) {
      this.pop = Math.max(0, this.pop - dt);
      this.avatar.root.position.y = 0.18 + Math.sin((1 - this.pop / 0.35) * Math.PI) * 0.25;
    }
    const p = this.sparkles.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * 0.25;
      if (y > 5) y = -1;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  }
}

// ---------- a portrait of your character (for the top-right button) ----------
let portraitRenderer = null;
export function portrait(look, size = 96) {
  portraitRenderer ??= new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  const r = portraitRenderer;
  r.setPixelRatio(1);
  r.setSize(size * 2, size * 2, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1, 2, 3);
  scene.add(key);
  const a = buildAvatar(look);
  scene.add(a.root);
  a.head.rotation.y = 0.25;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const hasHat = !!look.hat;
  cam.position.set(0.4, 2.1 + (hasHat ? 0.2 : 0), 3.6 + (hasHat ? 0.4 : 0));
  cam.lookAt(0, 1.98 + (hasHat ? 0.15 : 0), 0);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  disposeAvatar(a);
  return url;
}

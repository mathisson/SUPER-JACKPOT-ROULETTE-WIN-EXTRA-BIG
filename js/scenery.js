import * as THREE from 'three';

// The casino around the wheel: table + rail, felt print, chip stacks, carpet,
// rows of slot machines, bokeh lights, a spotlight beam with dust, coloured light pools.
// Everything is procedural (canvas textures), no image files.

const TABLE_W = 16;
const TABLE_D = 12;
const TABLE_Y = -0.42;
const FLOOR_Y = -8;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, renderer, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ---------- textures ----------
function feltTexture(renderer) {
  const W = 2048;
  const H = 1536;
  const [c, g] = canvas(W, H);
  const k = W / TABLE_W; // px per world unit; the wheel sits at the canvas centre
  const cx = W / 2;
  const cy = H / 2;

  const bg = g.createRadialGradient(cx, cy, 200, cx, cy, W * 0.62);
  bg.addColorStop(0, '#15864c');
  bg.addColorStop(1, '#073d22');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // felt fibres
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const gold = g.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#f6d98a');
  gold.addColorStop(0.5, '#c9953a');
  gold.addColorStop(1, '#f6d98a');

  // printed gold rings with lettering around the wheel
  g.strokeStyle = gold;
  for (const [r, w] of [[5.05, 5], [5.15, 2], [5.95, 2], [6.05, 5]]) {
    g.lineWidth = w;
    g.beginPath();
    g.arc(cx, cy, r * k, 0, Math.PI * 2);
    g.stroke();
  }
  const text = 'SUPER JACKPOT ROULETTE ✦ WIN EXTRA BIG ✦ ';
  const full = text.repeat(2);
  g.fillStyle = gold;
  g.font = 'bold 50px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const r = 5.55 * k;
  const step = (Math.PI * 2) / full.length;
  [...full].forEach((ch, i) => {
    const a = i * step - Math.PI / 2;
    g.save();
    g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
  });

  // corner flourishes
  const star = (x, y, s) => {
    g.save();
    g.translate(x, y);
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const rr = i % 2 ? s * 0.38 : s;
      const a = (i / 16) * Math.PI * 2;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.restore();
  };
  const mx = 1.6 * k;
  const my = 1.6 * k;
  for (const [x, y] of [[mx, my], [W - mx, my], [mx, H - my], [W - mx, H - my]]) {
    star(x, y, 60);
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, 90, 0, Math.PI * 2);
    g.stroke();
  }
  // inset border line
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(0.55 * k, 0.55 * k, W - 1.1 * k, H - 1.1 * k, 2.4 * k);
  g.stroke();

  return tex(c, renderer);
}

function carpetTexture(renderer) {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#3a0a1c';
  g.fillRect(0, 0, S, S);
  const T = S / 4;
  for (let yi = 0; yi < 4; yi++) {
    for (let xi = 0; xi < 4; xi++) {
      const x = xi * T + T / 2;
      const y = yi * T + T / 2;
      const alt = (xi + yi) % 2;
      // gold medallion
      g.strokeStyle = '#d9a441';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x, y, T * 0.34, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, T * 0.22, 0, Math.PI * 2);
      g.stroke();
      // teal / magenta diamond
      g.fillStyle = alt ? '#15a3a3' : '#d62f8a';
      g.beginPath();
      g.moveTo(x, y - T * 0.16);
      g.lineTo(x + T * 0.16, y);
      g.lineTo(x, y + T * 0.16);
      g.lineTo(x - T * 0.16, y);
      g.closePath();
      g.fill();
      // swirl petals in the gaps
      g.strokeStyle = alt ? '#ff9f1c' : '#7b3fd6';
      g.lineWidth = 4;
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2 + Math.PI / 4;
        g.beginPath();
        g.arc(x + Math.cos(a) * T * 0.5, y + Math.sin(a) * T * 0.5, T * 0.13, a + Math.PI * 0.7, a + Math.PI * 1.9);
        g.stroke();
      }
      g.fillStyle = '#f2d06b';
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c, renderer, { repeat: [28, 28] });
}

function softDot() {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const CHIP_COLORS = ['#c9182b', '#13894a', '#1b1b1b', '#6b2fb3', '#e0b45c', '#1d5fd1'];

function chipSideTexture(color, renderer) {
  const [c, g] = canvas(256, 32);
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 8, 5, 14, 22);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(0, 0, 256, 2);
  g.fillRect(0, 30, 256, 2);
  return tex(c, renderer);
}
function chipTopTexture(color, renderer) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = color;
  g.beginPath();
  g.arc(64, 64, 64, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) {
    g.save();
    g.translate(64, 64);
    g.rotate((i / 8) * Math.PI * 2);
    g.fillRect(-7, -64, 14, 18);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 3;
  g.setLineDash([6, 5]);
  g.beginPath();
  g.arc(64, 64, 36, 0, Math.PI * 2);
  g.stroke();
  return tex(c, renderer);
}

const SYMBOLS = [['7', '#ff2d55'], ['BAR', '#ffd23f'], ['$', '#3ef08a'], ['★', '#ffb000'], ['♦', '#4dc9ff'], ['7', '#ff2d55']];
function slotScreenTexture(renderer) {
  const [c, g] = canvas(256, 200);
  const bg = g.createLinearGradient(0, 0, 0, 200);
  bg.addColorStop(0, pick(['#2b0b4d', '#08244d', '#4d0b1f', '#0b3b2b']));
  bg.addColorStop(1, '#050208');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 200);
  g.fillStyle = '#ffe28a';
  g.font = 'bold 24px Georgia, serif';
  g.textAlign = 'center';
  g.fillText(pick(['LUCKY 7s', 'GOLD RUSH', 'MEGA SPIN', 'DIAMOND', 'FIRE WIN']), 128, 30);
  for (let i = 0; i < 3; i++) {
    const x = 18 + i * 76;
    const reel = g.createLinearGradient(0, 50, 0, 170);
    reel.addColorStop(0, '#9a9a9a');
    reel.addColorStop(0.5, '#ffffff');
    reel.addColorStop(1, '#9a9a9a');
    g.fillStyle = reel;
    g.fillRect(x, 50, 68, 120);
    const [sym, col] = pick(SYMBOLS);
    g.fillStyle = col;
    g.font = `bold ${sym.length > 1 ? 26 : 56}px Georgia, serif`;
    g.textBaseline = 'middle';
    g.fillText(sym, x + 34, 112);
  }
  g.fillStyle = 'rgba(255,40,80,0.8)';
  g.fillRect(10, 109, 236, 3);
  return tex(c, renderer);
}
function slotTopperTexture(label, hue, renderer) {
  const [c, g] = canvas(256, 110);
  const bg = g.createLinearGradient(0, 0, 0, 110);
  bg.addColorStop(0, `hsl(${hue} 90% 55%)`);
  bg.addColorStop(1, `hsl(${hue} 90% 22%)`);
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 110);
  // marquee bulbs
  g.fillStyle = '#fff6c8';
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.arc(8 + i * 16, 7, 4, 0, Math.PI * 2);
    g.arc(8 + i * 16, 103, 4, 0, Math.PI * 2);
    g.fill();
  }
  g.font = `900 ${label.length > 5 ? 38 : 54}px Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.strokeText(label, 128, 57);
  g.fillStyle = '#fffbe6';
  g.fillText(label, 128, 57);
  return tex(c, renderer);
}

// ---------- build ----------
export function buildScenery(scene, renderer) {
  const animated = { bokeh: [], toppers: [], motes: null, beam: null };

  scene.background = new THREE.Color(0x0c0410);
  scene.fog = new THREE.Fog(0x0c0410, 16, 52);

  // --- table top (felt) ---
  const feltGeo = new THREE.ShapeGeometry(roundedRect(TABLE_W, TABLE_D, 3), 24);
  const pos = feltGeo.attributes.position;
  const uv = feltGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + TABLE_W / 2) / TABLE_W, (pos.getY(i) + TABLE_D / 2) / TABLE_D);
  }
  const felt = new THREE.Mesh(
    feltGeo,
    new THREE.MeshStandardMaterial({ map: feltTexture(renderer), roughness: 0.95 })
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = TABLE_Y;
  felt.receiveShadow = true;
  scene.add(felt);

  // --- padded leather rail + gold trim + wooden body ---
  const ring = (w1, d1, r1, w2, d2, r2) => {
    const s = roundedRect(w1, d1, r1);
    s.holes.push(roundedRect(w2, d2, r2));
    return s;
  };
  const extrude = (shape, depth, bevel, mat, y) => {
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 5,
        curveSegments: 32,
      }),
      mat
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const leather = new THREE.MeshStandardMaterial({ color: 0x4a0d14, roughness: 0.5, metalness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9ab52, metalness: 1, roughness: 0.25 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3b1a0a, roughness: 0.4 });
  extrude(ring(TABLE_W + 1.6, TABLE_D + 1.6, 3.8, TABLE_W + 0.2, TABLE_D + 0.2, 3.1), 0.35, 0.3, leather, TABLE_Y);
  extrude(ring(TABLE_W + 0.3, TABLE_D + 0.3, 3.15, TABLE_W, TABLE_D, 3), 0.06, 0, gold, TABLE_Y);
  extrude(roundedRect(TABLE_W + 2.4, TABLE_D + 2.4, 4.2), 1.2, 0.15, wood, TABLE_Y - 1.5);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e0c05, roughness: 0.5 });
  for (const [x, z] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, FLOOR_Y * -1 - 1.9, 16), legMat);
    leg.position.set(x, (TABLE_Y - 1.5 + FLOOR_Y) / 2, z);
    scene.add(leg);
  }

  // --- chip stacks on the felt ---
  const chipMats = CHIP_COLORS.map((col) => {
    const top = new THREE.MeshStandardMaterial({ map: chipTopTexture(col, renderer), roughness: 0.4 });
    return { col, top, side: chipSideTexture(col, renderer) };
  });
  const CHIP_H = 0.06;
  const CHIP_R = 0.3;
  const stack = (x, z, n, mi) => {
    const m = chipMats[mi];
    const side = m.side.clone();
    side.wrapS = side.wrapT = THREE.RepeatWrapping;
    side.repeat.set(3, n);
    side.needsUpdate = true;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H * n, 40), [
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.4 }),
      m.top,
      m.top,
    ]);
    mesh.position.set(x, TABLE_Y + (CHIP_H * n) / 2, z);
    mesh.rotation.y = rand(0, Math.PI * 2);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  };
  [
    [-6.4, 3.3, 14, 0], [-5.75, 3.55, 9, 1], [-6.25, 4.0, 18, 4], [-5.6, 4.2, 6, 2],
    [6.3, 3.4, 16, 3], [5.7, 3.85, 10, 0], [6.5, 4.1, 7, 5],
    [-6.4, -3.9, 12, 2], [-5.8, -4.3, 8, 4],
    [6.3, -3.8, 13, 1], [5.7, -4.25, 5, 3], [6.6, -4.4, 15, 4],
  ].forEach(([x, z, n, mi]) => stack(x, z, n, mi));
  // a few loose chips lying about
  for (const [x, z, mi] of [[-4.6, 5.3, 1], [4.8, 5.2, 4], [-6.9, 0.2, 3], [7.0, -0.6, 0]]) {
    const m = chipMats[mi];
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 40), [
      new THREE.MeshStandardMaterial({ map: m.side, roughness: 0.4 }), m.top, m.top,
    ]);
    chip.position.set(x, TABLE_Y + CHIP_H / 2, z);
    chip.rotation.y = rand(0, 6);
    chip.castShadow = true;
    scene.add(chip);
  }

  // --- carpet ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ map: carpetTexture(renderer), roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // coloured light pools on the carpet
  [[0xff2d9a, -14, -10], [0x2de0ff, 14, -10], [0xffb020, 0, -18], [0xa040ff, -20, 4], [0xff4030, 20, 4]].forEach(
    ([col, x, z]) => {
      const l = new THREE.PointLight(col, 90, 26, 1.6);
      l.position.set(x, FLOOR_Y + 3, z);
      scene.add(l);
    }
  );
  // coloured rim lights on the table
  const rimL = new THREE.PointLight(0xff3d9a, 22, 22, 1.5);
  rimL.position.set(-10, 3, -6);
  const rimR = new THREE.PointLight(0x3dd8ff, 22, 22, 1.5);
  rimR.position.set(10, 3, -6);
  scene.add(rimL, rimR);

  // --- slot machines in curved rows around the table ---
  const screens = Array.from({ length: 6 }, () => slotScreenTexture(renderer));
  const TOPPERS = [['777', 0], ['JACKPOT', 45], ['WILD', 280], ['BONUS', 190], ['MEGA', 320], ['WIN!', 130]];
  const topperMats = TOPPERS.map(([label, hue]) =>
    new THREE.MeshBasicMaterial({ map: slotTopperTexture(label, hue, renderer) })
  );
  const bodyMats = [0x1a1a24, 0x2a0f18, 0x101c2a].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.35 })
  );
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.2 });
  const stripMats = [0xff2d55, 0x2de0ff, 0xffc233, 0xb04dff].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const screenGeo = new THREE.PlaneGeometry(1.9, 1.5);
  const bodyGeo = new THREE.BoxGeometry(2.4, 4.4, 2.0);
  const topGeo = new THREE.BoxGeometry(2.4, 1.05, 0.9);
  const stripGeo = new THREE.BoxGeometry(0.08, 4.4, 0.08);
  const shelfGeo = new THREE.BoxGeometry(2.2, 0.18, 0.6);

  const slot = (x, z, rotY) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, pick(bodyMats));
    body.position.y = 2.2;
    g.add(body);
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: pick(screens) }));
    screen.position.set(0, 3.15, 1.01);
    g.add(screen);
    const ti = (Math.random() * topperMats.length) | 0;
    const topper = new THREE.Mesh(topGeo, [
      bodyMats[0], bodyMats[0], bodyMats[0], bodyMats[0], topperMats[ti], bodyMats[0],
    ]);
    topper.position.set(0, 4.95, 0.45);
    g.add(topper);
    const shelf = new THREE.Mesh(shelfGeo, chrome);
    shelf.position.set(0, 2.1, 1.2);
    g.add(shelf);
    const sm = pick(stripMats);
    for (const sx of [-1.2, 1.2]) {
      const strip = new THREE.Mesh(stripGeo, sm);
      strip.position.set(sx, 2.2, 1.0);
      g.add(strip);
    }
    g.position.set(x, FLOOR_Y, z);
    g.rotation.y = rotY;
    scene.add(g);
  };
  // machines face the table: angle φ measured from straight behind the wheel
  const row = (R, from, to, step) => {
    for (let deg = from; deg <= to; deg += step) {
      const phi = THREE.MathUtils.degToRad(deg + rand(-1, 1));
      slot(R * Math.sin(phi), -R * Math.cos(phi) + 1, -phi);
    }
  };
  row(15.5, -110, 110, 10);
  row(21, -104, 104, 8);
  row(27, -96, 96, 7);
  animated.toppers = topperMats;

  // --- bokeh lights floating in the haze ---
  const dot = softDot();
  const BOKEH = [0xffc860, 0xff5a8a, 0x5ad8ff, 0xffffff, 0xff9a3d, 0xc080ff];
  for (let i = 0; i < 110; i++) {
    const mat = new THREE.SpriteMaterial({
      map: dot,
      color: pick(BOKEH),
      transparent: true,
      opacity: rand(0.25, 0.7),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const s = new THREE.Sprite(mat);
    const a = rand(-Math.PI * 0.95, Math.PI * 0.95);
    const R = rand(14, 40);
    s.position.set(R * Math.sin(a), rand(FLOOR_Y + 1, 5), -R * Math.cos(a));
    const size = rand(0.8, 3.2);
    s.scale.set(size, size, 1);
    s.userData = { base: mat.opacity, speed: rand(0.5, 2), phase: rand(0, 6) };
    scene.add(s);
    animated.bokeh.push(s);
  }

  // --- spotlight beam over the wheel, with drifting dust ---
  const [bc, bg] = canvas(4, 128);
  const grad = bg.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,240,200,0.9)');
  grad.addColorStop(1, 'rgba(255,240,200,0)');
  bg.fillStyle = grad;
  bg.fillRect(0, 0, 4, 128);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 6.2, 16, 48, 1, true),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(bc),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  beam.position.y = 7.6;
  scene.add(beam);
  animated.beam = beam;

  const N = 260;
  const motePos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const h = rand(0, 14);
    const r = Math.sqrt(Math.random()) * (6 - h * 0.35);
    const a = rand(0, Math.PI * 2);
    motePos.set([Math.cos(a) * r, h, Math.sin(a) * r], i * 3);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      map: dot,
      color: 0xfff0c8,
      size: 0.09,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(motes);
  animated.motes = motes;

  // --- per-frame life ---
  return {
    update(t, dt) {
      for (const s of animated.bokeh) {
        const u = s.userData;
        s.material.opacity = u.base * (0.55 + 0.45 * Math.sin(t * u.speed + u.phase));
      }
      animated.toppers.forEach((m, i) => {
        // marquee blink: mostly on, with a quick chase flicker
        const v = 0.75 + 0.25 * Math.sin(t * 6 + i * 1.3);
        m.color.setScalar(Math.sin(t * 1.7 + i) > 0.92 ? 0.35 : v);
      });
      animated.beam.material.opacity = 0.085 + 0.02 * Math.sin(t * 0.8);
      const p = animated.motes.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + dt * 0.25;
        if (y > 14) y = 0;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.05);
      }
      p.needsUpdate = true;
    },
  };
}

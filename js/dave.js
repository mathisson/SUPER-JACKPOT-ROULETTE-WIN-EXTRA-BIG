// 🍺 DAVE'S REVENGE: you met Dave (at a bottle party, or just by being drunk enough) and now
// he won't leave you alone. He shows up at your roulette table in 3D, borrows chips he will
// never pay back, and texts you "u up? 🎰" at the worst moments.

import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

// where Dave stands: ON your table, left of the wheel (feet on the felt)
const SPOT = new THREE.Vector3(-5.2, 0.8, -1.0);
const OFFSTAGE = new THREE.Vector3(-13, 0.8, -1.0);

const TEXTS = [
  'u up? 🎰',
  'bro i found a system. red. always red. trust me',
  'whos the guy with the mustache. he keeps staring at me',
  'remember when we danced with the bottle girls?? best night of my life',
  'my wife found the receipt',
  'i put my car on 17',
  'ur still at the casino right? save me a seat',
  'is it weird that the waiter never stops at my table either',
  'u have my shoes',
  'the chef says im not allowed back in the kitchen. long story',
];
const OWED_TEXTS = [
  (o) => `i still owe u ${money(o)} right? lets just say ${money(Math.max(0, o - 50))} 😅`,
  (o) => `about the ${money(o)}. i can pay u back in exposure`,
  (o) => `${money(o)} is basically nothing in casino money. we good?`,
];
const HI = ['Heyyy! 🍺', 'My favourite high roller!', 'Scoot over, lucky seat!', 'Did I miss anything?? 🎰'];
const BYE = ["Gotta go, my wife's calling 📞", 'Be right back. (He will not be right back)', 'Going to find my shoes!', 'Love you man. Bye.'];
const WIN = ['WE WON!! (You won.)', 'THAT WAS MY SYSTEM!', 'LET\'S GOOO 🙌', 'I KNEW IT. I knew nothing, but I KNEW IT.'];
const LOSE = ['Ohhh so close', 'The wheel is rigged. Against ME specifically.', 'That one didn\'t count', 'Unlucky, bro 😬'];
const ASK = ['Can I borrow {x}? I\'m good for it 👍', 'Spot me {x}? Pay you back Tuesday', 'Quick {x} for my system?', '{x} for a drink? For both of us. For me.'];
const POKE = ['Heyyy 👋', 'Stop poking me, I\'m concentrating', 'Your money? Next week. Definitely next week.', 'I\'m not drunk, YOU\'RE drunk', '*hic*'];

// ---------- the 3D Dave ----------
function buildDave() {
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.65 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xdce8f6, roughness: 0.8 });
  const sweat = new THREE.MeshStandardMaterial({ color: 0xb4c6dc, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x353c4a, roughness: 0.8 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc0182a, roughness: 0.6 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });

  const root = new THREE.Group(); // at the waist
  const body = new THREE.Group();
  root.add(body);

  const shoe = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.5 });
  const legs = [-0.24, 0.24].map((x) => {
    const g = new THREE.Group(); // pivots at the hip
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

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.8, 6, 16), shirt);
  torso.scale.set(1, 1, 0.78);
  torso.position.y = 0.72;
  body.add(torso);
  for (const x of [-0.42, 0.42]) {
    const stain = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), sweat);
    stain.scale.set(0.5, 1, 0.9);
    stain.position.set(x, 1.05, 0.05);
    body.add(stain);
  }
  // open collar
  const collar = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 3), skin);
  collar.rotation.x = Math.PI;
  collar.position.set(0, 1.42, 0.36);
  body.add(collar);

  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.62, 1.3, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.75, 4, 10), shirt);
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

  // the beer, which never leaves his hand
  const mug = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.15, 0.42, 16),
    new THREE.MeshStandardMaterial({ color: 0xffbe3c, roughness: 0.1, transparent: true, opacity: 0.85 })
  );
  mug.add(glass);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  foam.position.y = 0.25;
  mug.add(foam);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI), glass.material);
  handle.rotation.z = -Math.PI / 2;
  handle.position.x = 0.17;
  mug.add(handle);
  mug.position.set(0, -1.05, 0.08);
  armL.g.add(mug);

  const head = new THREE.Group();
  head.position.y = 1.95;
  body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), skin));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe0706a, roughness: 0.5 }));
  nose.position.set(0, -0.02, 0.41);
  head.add(nose);
  for (const x of [-0.15, 0.15]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.02), dark); // half-shut, as always
    eye.position.set(x, 0.08, 0.39);
    eye.rotation.z = x * 0.8;
    head.add(eye);
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xff6a6a, transparent: true, opacity: 0.55, roughness: 0.6 })
    );
    cheek.position.set(x * 1.6, -0.08, 0.33);
    head.add(cheek);
  }
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7a1d1d }));
  grin.rotation.z = Math.PI;
  grin.position.set(0, -0.14, 0.38);
  head.add(grin);
  // messy hair
  for (let i = 0; i < 9; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), hair);
    const a = (i / 9) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.2, 0.36, Math.sin(a) * 0.2 - 0.04);
    spike.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    head.add(spike);
  }
  // the tie, tied round his head
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 8, 32), red);
  band.rotation.x = Math.PI / 2 - 0.2;
  band.position.y = 0.2;
  head.add(band);
  for (const [dz, rz] of [[0, 0.5], [0.08, 0.8]]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.03), red);
    tail.position.set(0.44, 0.02, -0.08 + dz);
    tail.rotation.z = rz;
    head.add(tail);
  }

  root.traverse((o) => o.isMesh && (o.castShadow = true));
  root.scale.setScalar(0.8);
  return { root, body, head, armL, armR, mug, legs };
}

/**
 * @param wheel     the roulette wheel (its Three.js scene, camera and a per-frame hook)
 * @param stage     the element the wheel lives in (Dave's speech bubble goes here)
 * @param borrow    (amount, toPoint) => bool, move chips from the rack to Dave
 * @param repay     (amount, fromPoint) => void, the rarest event in the casino
 * @param isIdle    () => bool, nothing else is going on, Dave may drop by
 */
export function createDave({ wheel, stage, store, sound, toast, booze, getBalance, borrow, repay, isIdle }) {
  const state = store.get('fr.dave', { met: false, owed: 0, texts: [] });
  const save = () => store.set('fr.dave', state);

  const dave = buildDave();
  dave.root.visible = false;
  dave.root.position.copy(OFFSTAGE);
  wheel.scene.add(dave.root);

  const bubble = document.createElement('div');
  bubble.className = 'dave-bubble';
  stage.appendChild(bubble);

  // visit state
  let mode = 'away'; // away | enter | here | leave
  let modeT = 0;
  let react = null; // { kind: 'win'|'lose'|'ask', t }
  let spinsHere = 0;
  let idleT = 0;
  let bubbleT = 0;
  let visitTimer = null;
  let textTimer = null;

  function say(text, secs = 3) {
    bubble.textContent = text;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    bubbleT = secs;
  }

  // Dave's screen position, for the bubble and for chips flying to him
  const tmp = new THREE.Vector3();
  function screenPoint(yUp = 2.3) {
    dave.root.getWorldPosition(tmp);
    tmp.y += yUp;
    tmp.project(wheel.camera);
    const r = wheel.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((tmp.x + 1) / 2) * r.width, y: r.top + ((1 - tmp.y) / 2) * r.height, behind: tmp.z > 1 };
  }

  function meet(how) {
    if (state.met) return;
    state.met = true;
    save();
    scheduleTexts(40000);
    if (how === 'party') scheduleVisit(45000);
  }

  // ---------- visits ----------
  function scheduleVisit(ms = rand(150000, 300000)) {
    clearTimeout(visitTimer);
    visitTimer = setTimeout(() => (isIdle() ? visit() : scheduleVisit(20000)), ms);
  }

  function visit(first = false) {
    if (mode !== 'away') return;
    mode = 'enter';
    modeT = 0;
    spinsHere = 0;
    idleT = 0;
    dave.root.visible = true;
    dave.root.position.copy(OFFSTAGE);
    say(first ? "Heyyy! I'm Dave! 🍺 Nice table. I'm standing on it now." : pick(HI));
    sound.blip(220, 0.25, 'sawtooth', 0.05);
  }

  function leave(line = pick(BYE)) {
    if (mode !== 'here') return;
    mode = 'leave';
    modeT = 0;
    say(line);
  }

  function ask() {
    const bal = getBalance();
    if (bal < 10) return say("Bro you're broker than me 😬 I'll buy YOU a drink. (He will not.)", 4);
    const amt = [25, 50, 100].filter((x) => x <= bal * 0.25).pop() || 5;
    react = { kind: 'ask', t: 0 };
    say(pick(ASK).replace('{x}', money(amt)), 3.2);
    setTimeout(() => {
      if (mode !== 'here' || !borrow(amt, () => screenPoint(1.6))) return;
      state.owed += amt;
      save();
      toast(`💸 Dave borrowed ${money(amt)}. He's good for it. (He owes you ${money(state.owed)}.)`);
      setTimeout(() => mode === 'here' && say(pick(["I'm good for it! 👍", 'Thanks bro. Love you.', "I'll pay you back with interest. Negative interest."])), 900);
    }, 1400);
  }

  /** Called after every roulette spin. */
  function onSpin(net) {
    if (mode !== 'here') return;
    spinsHere++;
    idleT = 0;
    if (net > 0) {
      react = { kind: 'win', t: 0 };
      say(pick(WIN));
      // extremely rare: he pays some of it back
      if (state.owed > 0 && Math.random() < 0.12) {
        setTimeout(() => {
          if (mode !== 'here') return;
          repay(1, () => screenPoint(1.6));
          state.owed = Math.max(0, state.owed - 1);
          save();
          say('Here, paying you back! …well, $1 of it. We\'re even-ish.', 3.5);
        }, 1600);
      }
    } else if (net < 0) {
      react = { kind: 'lose', t: 0 };
      say(pick(LOSE));
      if (Math.random() < 0.55) setTimeout(() => mode === 'here' && ask(), 1800);
    }
    if (spinsHere >= 3) setTimeout(() => leave(), 4500);
  }

  // click Dave (without dragging the camera)
  const ray = new THREE.Raycaster();
  let downAt = null;
  const canvas = wheel.renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || mode !== 'here' || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), wheel.camera);
    if (!ray.intersectObject(dave.root, true).length) return;
    react = { kind: 'win', t: 0.6 };
    say(state.owed ? `${pick(POKE)} (owes you ${money(state.owed)})` : pick(POKE));
    sound.blip(300, 0.08, 'triangle', 0.08);
  });

  // ---------- animation, every frame of the roulette scene ----------
  wheel.onFrame((dt, t) => {
    if (bubbleT > 0 && (bubbleT -= dt) <= 0) bubble.classList.remove('pop');
    if (mode === 'away') return;
    modeT += dt;
    const p = dave.root.position;
    const walking = mode === 'enter' || mode === 'leave';
    if (mode === 'enter') {
      const k = Math.min(1, modeT / 3.2);
      p.lerpVectors(OFFSTAGE, SPOT, 1 - (1 - k) ** 2);
      p.x += Math.sin(modeT * 7) * 0.08; // three steps forward, a little lurch
      if (k >= 1) {
        mode = 'here';
        modeT = 0;
      }
    } else if (mode === 'leave') {
      const k = Math.min(1, modeT / 3);
      p.lerpVectors(SPOT, OFFSTAGE, k * k);
      if (k >= 1) {
        mode = 'away';
        dave.root.visible = false;
        bubble.classList.remove('pop');
        scheduleVisit();
      }
    } else {
      // hang around; ask for money if nobody spins for a while, leave eventually
      idleT += dt;
      if (idleT > 22 && Math.random() < dt * 0.15) {
        idleT = 0;
        Math.random() < 0.5 ? ask() : say(pick(TEXTS.slice(1, 6)).replace(/^./, (c) => c.toUpperCase()));
      }
      if (modeT > 80) leave();
    }

    // drunk idle: sway, wobbly head, a sip every few seconds
    const b = dave.body;
    const stepBob = walking ? Math.abs(Math.sin(modeT * 7)) * 0.12 : 0;
    b.position.y = stepBob + Math.sin(t * 2.3) * 0.03;
    b.rotation.z = Math.sin(t * 1.3) * 0.12 + (walking ? Math.sin(modeT * 7) * 0.1 : 0);
    b.rotation.x = 0.18 + Math.sin(t * 0.9) * 0.05;
    dave.head.rotation.z = Math.sin(t * 1.9 + 1) * 0.18;
    dave.head.rotation.x = Math.sin(t * 1.1) * 0.08;
    // legs: a proper stagger when walking, a drunk little shuffle when not
    const swing = walking ? Math.sin(modeT * 7) * 0.55 : Math.sin(t * 2.6) * 0.12;
    dave.legs[0].rotation.x = swing;
    dave.legs[1].rotation.x = -swing;
    const sip = Math.max(0, Math.sin(t * 0.9) - 0.75) * 4; // 0..1 now and then
    let aL = 0.3 + sip * 2.2;
    let aR = -0.25 + Math.sin(t * 2.1) * 0.12;
    let spread = 0;
    if (react) {
      react.t += dt;
      const k = react.t;
      if (react.kind === 'win') {
        aL = aR = Math.PI * 0.9 + Math.sin(k * 16) * 0.3; // both arms up, beer everywhere
        spread = 0.35;
        b.position.y += Math.abs(Math.sin(k * 9)) * 0.25;
      } else if (react.kind === 'lose') {
        b.rotation.x = 0.55; // slump
        dave.head.rotation.x = 0.4;
      } else if (react.kind === 'ask') {
        aR = -1.4 + Math.sin(k * 5) * 0.08; // hand out, palm up
      }
      if (k > 2.2) react = null;
    }
    dave.armL.g.rotation.x = -aL;
    dave.armR.g.rotation.x = react?.kind === 'ask' ? aR : -aR;
    dave.armL.g.rotation.z = -spread;
    dave.armR.g.rotation.z = spread;
    dave.root.rotation.y = walking ? (mode === 'enter' ? 0.9 : -0.9) : Math.sin(t * 0.5) * 0.15;

    // keep the bubble over his head
    if (bubble.classList.contains('pop')) {
      const s = screenPoint();
      const sr = stage.getBoundingClientRect();
      bubble.style.left = `${s.x - sr.left}px`;
      bubble.style.top = `${s.y - sr.top}px`;
      bubble.style.visibility = s.behind ? 'hidden' : '';
    }
  });

  // ---------- texts ----------
  const phone = document.createElement('div');
  phone.className = 'dave-text';
  document.body.appendChild(phone);
  let phoneHide = null;

  function text(msg) {
    msg ||= state.owed > 0 && Math.random() < 0.35 ? pick(OWED_TEXTS)(state.owed) : pick(TEXTS);
    state.texts = [...state.texts, { m: msg, t: Date.now() }].slice(-6);
    save();
    phone.innerHTML = `<div class="dt-top"><span class="dt-app">💬 Messages</span><span>now</span></div>
      <div class="dt-from">Dave 🍺</div><div class="dt-msg"></div><div class="dt-foot">Tap to leave on read</div>`;
    phone.querySelector('.dt-msg').textContent = msg;
    phone.classList.remove('seen');
    phone.classList.add('show');
    sound.blip(1320, 0.07, 'sine', 0.1);
    sound.blip(1760, 0.09, 'sine', 0.08, 0.09);
    clearTimeout(phoneHide);
    phoneHide = setTimeout(() => phone.classList.remove('show'), 6000);
  }
  phone.addEventListener('click', () => {
    phone.classList.add('seen');
    phone.querySelector('.dt-foot').textContent = 'Read ✓✓ (he saw that)';
    clearTimeout(phoneHide);
    phoneHide = setTimeout(() => phone.classList.remove('show'), 1400);
    setTimeout(() => Math.random() < 0.5 && text(pick(['???', 'wow ok', 'i can see u read that', 'ur typing… no ur not'])), 5000);
  });

  function scheduleTexts(ms = rand(100000, 200000)) {
    clearTimeout(textTimer);
    textTimer = setTimeout(() => {
      if (isIdle() && mode === 'away' && !document.hidden) text();
      scheduleTexts();
    }, ms);
  }

  // Being drunk enough is how you meet Dave if you've never been to a bottle party
  setInterval(() => {
    if (!state.met && booze.level() >= 3 && isIdle() && mode === 'away') {
      meet('bar');
      visit(true);
    }
  }, 4000);

  if (state.met) {
    scheduleVisit(rand(60000, 120000));
    scheduleTexts(rand(45000, 90000));
  }

  return {
    meet,
    onSpin,
    visit,
    text,
    met: () => state.met,
    owed: () => state.owed,
    texts: () => state.texts.map((x) => x.m),
    here: () => mode !== 'away',
  };
}

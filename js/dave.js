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

// ---- the phone conversation: what you can say, and how Dave takes it ----
export const REPLIES = {
  nice: ['love u man ❤️', 'best night ever 🍾', 'ur the best dave', 'miss u buddy', 'come by the table later!'],
  weird: ['who is this?', 'new phone who dis', 'is this the pizza place?', 'k', '🦐'],
  mean: ['pay me back.', 'stop texting me', 'no.', 'leave me alone dave', 'u owe me money'],
  sorry: ['sorry dave 🥺'],
};
const MOOD = { nice: 18, weird: -4, mean: -28, sorry: 45, ignored: -8 };
const ANGRY_AT = -55; // at or below this he comes over
const GIFT_AT = 55; // at or above this he sends something
const ANSWERS = {
  nice: ['AWWW 🥹', 'u get me bro', 'ur my best friend. my only friend', 'love u too man 🍺', 'ur gonna make me cry at the slots'],
  weird: ['its DAVE', 'DAVE. from the club', 'bro its me. DAVE', 'u have my shoes. remember?', '???'],
  mean: ['wow', 'ok thats it', 'after everything i did for u', 'u want ur money? come get it', 'rude'],
  sorry: ['...fine', 'ok i forgive u. hug? 🤗', 'u better be sorry', 'apology accepted. u still have my shoes'],
};
const ANGRY_HI = ['YOU. 😤', 'We need to TALK.', 'Oh you think you can text me like THAT?', 'Move. I\'m standing here now. ANGRILY.'];

// ---------- the 3D Dave ----------
export function buildDave() {
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
  const headMat = skin.clone(); // his own, so he can go red in the face
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), headMat));
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
  return { root, body, head, headMat, armL, armR, mug, legs };
}

/**
 * @param wheel     the roulette wheel (its Three.js scene, camera and a per-frame hook)
 * @param stage     the element the wheel lives in (Dave's speech bubble goes here)
 * @param borrow    (amount, toPoint) => bool, move chips from the rack to Dave
 * @param repay     (amount, fromPoint) => void, the rarest event in the casino
 * @param isIdle    () => bool, nothing else is going on, Dave may drop by
 * @param onSpill   () => void, he knocked his beer over the table
 */
export function createDave({ wheel, stage, store, sound, toast, booze, getBalance, borrow, repay, isIdle, onSpill }) {
  const state = store.get('fr.dave', { met: false, owed: 0, texts: [] });
  // older saves kept only his last few texts; the phone keeps the whole conversation
  state.thread ??= (state.texts || []).map((x) => ({ from: 'dave', m: x.m, t: x.t }));
  state.mood ??= 0;
  state.lastRead ??= 0;
  delete state.texts;
  const save = () => store.set('fr.dave', state);
  // the phone plugs in here: open/close it, is it open, where its button is
  const hooks = {};
  const listeners = [];
  const emit = (type, data) => listeners.forEach((fn) => fn(type, data));

  const dave = buildDave();
  const SKIN = dave.headMat.color.clone();
  const RED_FACE = new THREE.Color(0xe0302a);
  const steam = new THREE.Group();
  for (let i = 0; i < 8; i++) steam.add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })));
  steam.visible = false;
  dave.head.add(steam);
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
  let anger = 0; // 0..1, how red his face is
  let angryVisit = false;
  let awaitingSorry = false;
  let sorryTimer = null;
  let angryPending = false;
  let readTimer = null;

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

  function visit(first = false, angry = false) {
    if (mode !== 'away') return;
    mode = 'enter';
    modeT = 0;
    spinsHere = 0;
    idleT = 0;
    angryVisit = angry;
    dave.root.visible = true;
    dave.root.position.copy(OFFSTAGE);
    say(angry ? pick(ANGRY_HI) : first ? "Heyyy! I'm Dave! 🍺 Nice table. I'm standing on it now." : pick(HI));
    sound.blip(angry ? 110 : 220, angry ? 0.45 : 0.25, 'sawtooth', angry ? 0.09 : 0.05);
  }

  /** Angry Dave, once he's on the table: does something about it, then wants an apology. */
  function actAngry() {
    if (mode !== 'here' || !angryVisit) return;
    const bal = getBalance();
    if (bal >= 40 && Math.random() < 0.5) {
      const amt = Math.max(10, Math.floor(Math.min(250, bal * 0.4) / 10) * 10);
      say("This is INTEREST. 😤", 3);
      react = { kind: 'ask', t: 0 };
      setTimeout(() => {
        if (mode !== 'here' || !borrow(amt, () => screenPoint(1.6))) return;
        state.owed += amt;
        save();
        toast(`💸 Dave took ${money(amt)} as "interest". (He now "owes" you ${money(state.owed)}.)`);
      }, 1000);
    } else {
      say('Oops. 🍺 (Not oops.)', 3);
      react = { kind: 'win', t: 1.2 };
      onSpill?.();
      toast("🍺 Dave poured his beer all over the table. Everything is sticky now.");
    }
    setTimeout(() => {
      if (mode !== 'here') return;
      awaitingSorry = true;
      say("I'm not leaving until you say sorry. TEXT ME. 📱", 5);
      emit('sorry', true);
      clearTimeout(sorryTimer);
      sorryTimer = setTimeout(() => {
        if (!awaitingSorry) return;
        awaitingSorry = false;
        emit('sorry', false);
        state.mood = -15;
        save();
        leave("Fine. FINE. I'm leaving. 😤");
      }, 75000);
    }, 3800);
  }

  /** The food courier walks past and Dave helps himself. */
  function snatch(food) {
    if (mode !== 'here') return;
    react = { kind: 'ask', t: 0 };
    say(`Ooh, ${food}! For ME? You shouldn't have! 😋`, 3.5);
    state.mood = clamp(state.mood + 10);
    save();
    setTimeout(() => fromDave(`thx for the ${food} bro 😋 u r a real one`), 20000);
  }

  function apologized() {
    if (!awaitingSorry) return;
    awaitingSorry = false;
    angryVisit = false;
    clearTimeout(sorryTimer);
    emit('sorry', false);
    react = { kind: 'win', t: 0 };
    say('...fine. Hug? 🤗', 3);
    setTimeout(() => leave('Love you man. Bye.'), 3500);
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
    if (angryVisit) {
      react = { kind: net < 0 ? 'win' : 'lose', t: 0 };
      return say(net < 0 ? 'HA! Karma. 😤' : net > 0 ? "That doesn't count." : 'Hmph.');
    }
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
        if (angryVisit) setTimeout(actAngry, 1200);
      }
    } else if (mode === 'leave') {
      const k = Math.min(1, modeT / 3);
      p.lerpVectors(SPOT, OFFSTAGE, k * k);
      if (k >= 1) {
        mode = 'away';
        dave.root.visible = false;
        bubble.classList.remove('pop');
        angryVisit = false;
        scheduleVisit();
      }
    } else {
      // hang around; ask for money if nobody spins for a while, leave eventually
      idleT += dt;
      if (angryVisit) {
        // an angry Dave doesn't chat, he waits for his apology (see actAngry)
      } else if (idleT > 22 && Math.random() < dt * 0.15) {
        idleT = 0;
        Math.random() < 0.5 ? ask() : say(pick(TEXTS.slice(1, 6)).replace(/^./, (c) => c.toUpperCase()));
      }
      if (modeT > 80 && !angryVisit) leave();
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

    // angry: face goes red, steam comes out of his ears
    anger += ((angryVisit ? 1 : 0) - anger) * (1 - Math.exp(-dt * 2));
    dave.headMat.color.copy(SKIN).lerp(RED_FACE, anger);
    steam.visible = anger > 0.05;
    if (steam.visible) {
      steam.children.forEach((puff, i) => {
        const k = (t * 0.8 + i / steam.children.length) % 1;
        puff.position.set((i % 2 ? 1 : -1) * (0.45 + k * 0.25), 0.1 + k * 0.9, 0);
        puff.scale.setScalar(0.06 + k * 0.16);
        puff.material.opacity = (1 - k) * 0.8 * anger;
      });
    }

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

  /** The phone's text tone: a bright little three-note chime, and a buzz on real phones. */
  function textTone() {
    [1318.5, 1975.5, 2637].forEach((f, i) => {
      sound.blip(f, 0.16, 'triangle', 0.11, i * 0.085);
      sound.blip(f * 2, 0.06, 'sine', 0.03, i * 0.085);
    });
    // (browsers only allow vibrating once you have interacted with the page)
    try {
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([70, 50, 70]);
    } catch {}
  }

  /** A message from Dave lands in the thread: tone, buzz, and a banner unless you're looking at him. */
  function fromDave(msg, { banner = true } = {}) {
    state.thread = [...state.thread, { from: 'dave', m: msg, t: Date.now() }].slice(-60);
    save();
    textTone();
    emit('message');
    hooks.onText?.(msg);
    if (!banner || hooks.isReading?.()) return;
    phone.innerHTML = `<div class="dt-top"><span class="dt-app">💬 Messages</span><span>now</span></div>
      <div class="dt-from">Dave 🍺</div><div class="dt-msg"></div><div class="dt-foot">Tap to open 📱</div>`;
    phone.querySelector('.dt-msg').textContent = msg;
    phone.classList.add('show');
    clearTimeout(phoneHide);
    phoneHide = setTimeout(() => phone.classList.remove('show'), 6000);
  }

  function text(msg) {
    msg ||= state.owed > 0 && Math.random() < 0.35 ? pick(OWED_TEXTS)(state.owed) : pick(TEXTS);
    fromDave(msg);
  }
  phone.addEventListener('click', () => {
    phone.classList.remove('show');
    hooks.openPhone?.('messages');
  });

  // ---------- talking back ----------
  const clamp = (v) => Math.max(-100, Math.min(100, v));
  function reply(kind, msg) {
    state.thread = [...state.thread, { from: 'me', m: msg, t: Date.now() }].slice(-60);
    state.mood = clamp(state.mood + MOOD[kind]);
    state.lastRead = Date.now();
    clearTimeout(readTimer);
    save();
    emit('message');
    if (kind === 'sorry') apologized();
    setTimeout(() => {
      emit('typing', true);
      setTimeout(() => {
        emit('typing', false);
        const angry = kind === 'mean' && state.mood <= ANGRY_AT;
        fromDave(angry ? 'omw 😤' : pick(ANSWERS[kind]), { banner: false });
        // "who is this?" gets you a flood
        if (kind === 'weird' && Math.random() < 0.5) {
          setTimeout(() => fromDave('ITS DAVE', { banner: false }), 700);
          setTimeout(() => fromDave('D A V E', { banner: false }), 1400);
        }
        checkMood();
      }, rand(1100, 2600));
    }, 600);
  }

  function checkMood() {
    if (state.mood <= ANGRY_AT && !angryPending && mode === 'away') {
      angryPending = true;
      state.mood = -30;
      save();
      const go = () => {
        if (mode !== 'away') return setTimeout(go, 3000);
        if (!isIdle(true)) return setTimeout(go, 2500);
        angryPending = false;
        hooks.closePhone?.();
        setTimeout(() => visit(false, true), 500);
      };
      setTimeout(go, rand(5000, 9000));
    } else if (state.mood >= GIFT_AT) {
      state.mood = 25;
      save();
      setTimeout(() => fromDave('sending u something 😏', { banner: false }), 1500);
      setTimeout(() => {
        const from = hooks.phonePoint?.() || { x: innerWidth - 60, y: 40 };
        if (state.owed >= 25 && Math.random() < 0.35) {
          repay(25, from);
          state.owed -= 25;
          save();
          toast(`💸 Dave sent you ${money(25)} back! He still owes you ${money(state.owed)}.`);
        } else if (!booze.blackedOut()) {
          booze.add({ emoji: '🍹', name: "Dave's Special (mostly ice)", abv: 1.5 });
        }
      }, 3500);
    }
  }

  /** You opened his thread. Read and not answering is a choice, and he'll notice. */
  function markRead() {
    const had = unread();
    state.lastRead = Date.now();
    save();
    emit('read');
    clearTimeout(readTimer);
    if (!had) return;
    readTimer = setTimeout(() => {
      state.mood = clamp(state.mood + MOOD.ignored);
      save();
      fromDave(pick(['i can see u read that', '???', 'wow ok', 'left on read. by u. of all people']));
      checkMood();
    }, 45000);
  }
  const unread = () => state.thread.filter((x) => x.from === 'dave' && x.t > state.lastRead).length;

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
    reply,
    markRead,
    unread,
    met: () => state.met,
    owed: () => state.owed,
    mood: () => state.mood,
    thread: () => state.thread,
    texts: () => state.thread.filter((x) => x.from === 'dave').map((x) => x.m),
    here: () => mode !== 'away',
    wantsSorry: () => awaitingSorry,
    snatch,
    /** Subscribe to 'message' | 'typing' | 'read' | 'sorry'. */
    on: (fn) => listeners.push(fn),
    /** The phone plugs in: openPhone(app), closePhone(), isReading(), phonePoint(), onText(msg). */
    setHooks: (h) => Object.assign(hooks, h),
  };
}

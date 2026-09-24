// Full-screen win / loss effects: particle bursts, banners, screen shake, "YOU DIED".

const money = (n) => '$' + Math.abs(Math.round(n)).toLocaleString('en-US');

let active = null; // { el, finish }

export const fxActive = () => !!active;
export function dismissFx() {
  if (active) active.finish();
}

function mount(el, duration, onClose) {
  dismissFx();
  document.body.appendChild(el);
  let timer;
  const finish = () => {
    if (active?.el !== el) return;
    active = null;
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 700);
    onClose?.();
  };
  active = { el, finish };
  el.addEventListener('click', finish);
  timer = setTimeout(finish, duration);
  return finish;
}

// ---------- particles ----------
const canvas = document.createElement('canvas');
canvas.className = 'fx-canvas';
const ctx = canvas.getContext('2d');
let particles = [];
let emitters = [];
let running = false;
let last = 0;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', sizeCanvas);

const CONFETTI = ['#ffd84d', '#ff4d6d', '#4dd2ff', '#7dff6a', '#c77dff', '#ffffff', '#ff9f1c'];
const rand = (a, b) => a + Math.random() * (b - a);

function spawn(x, y, angle, speed, coin) {
  particles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: rand(0, Math.PI * 2),
    vr: rand(-8, 8),
    flip: rand(0, Math.PI * 2),
    vf: rand(6, 16),
    size: coin ? rand(10, 18) : rand(5, 9),
    coin,
    color: CONFETTI[(Math.random() * CONFETTI.length) | 0],
    life: rand(2.2, 3.6),
  });
}

function burst(x, y, count, power) {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + rand(-1.25, 1.25);
    spawn(x, y, a, rand(350, 1050) * power, Math.random() < 0.55);
  }
}

function drawCoin(p) {
  const r = p.size;
  ctx.scale(Math.max(0.08, Math.abs(Math.cos(p.flip))), 1);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#fff6c2');
  g.addColorStop(0.45, '#f2c14e');
  g.addColorStop(1, '#a8701a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7a4c0c';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(122,76,12,0.6)';
  ctx.stroke();
  ctx.fillStyle = '#7a4c0c';
  ctx.font = `bold ${r}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 1);
}

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  emitters = emitters.filter((e) => {
    e.t += dt;
    e.acc += dt * e.rate;
    while (e.acc >= 1) {
      e.acc -= 1;
      e.emit();
    }
    return e.t < e.duration;
  });

  particles = particles.filter((p) => {
    p.life -= dt;
    p.vy += 1100 * dt;
    const drag = p.coin ? 0.992 : 0.975;
    p.vx *= drag;
    p.vy *= drag;
    if (!p.coin) p.vy = Math.min(p.vy, 260); // confetti flutters
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.flip += p.vf * dt;
    if (p.life <= 0 || p.y > innerHeight + 40) return false;

    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 0.5);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.coin) {
      drawCoin(p);
    } else {
      ctx.scale(1, Math.cos(p.flip));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2);
    }
    ctx.restore();
    return true;
  });

  if (particles.length || emitters.length) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    canvas.remove();
  }
}

function startParticles() {
  if (!canvas.isConnected) {
    sizeCanvas();
    document.body.appendChild(canvas);
  }
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
}

// ---------- win ----------
export const TIERS = ['WIN', 'BIG WIN', 'MEGA WIN', 'JACKPOT!'];

export function winLevel(net, staked) {
  const mult = net / Math.max(staked, 1);
  return mult >= 15 ? 3 : mult >= 4 ? 2 : mult >= 1.5 ? 1 : 0;
}

export function celebrate({ net, level, origin }) {
  const duration = 2600 + level * 900;

  // Screen shake + flash
  const shaken = document.querySelectorAll('header, main');
  shaken.forEach((el) => {
    el.classList.remove('shake-0', 'shake-1', 'shake-2', 'shake-3');
    void el.offsetWidth;
    el.classList.add('shake-' + level);
  });
  setTimeout(() => shaken.forEach((el) => el.classList.remove('shake-' + level)), 900 + level * 250);

  // Particles
  startParticles();
  const ox = origin?.x ?? innerWidth / 2;
  const oy = origin?.y ?? innerHeight * 0.35;
  burst(ox, oy, 70 + level * 70, 1 + level * 0.15);
  if (level >= 1) {
    const fountain = (x, dir) => ({
      t: 0, acc: 0, rate: 40 + level * 25, duration: 1.2 + level * 0.5,
      emit: () => spawn(x, innerHeight + 10, -Math.PI / 2 + dir * rand(0.15, 0.55), rand(900, 1400), Math.random() < 0.5),
    });
    emitters.push(fountain(0, 1), fountain(innerWidth, -1));
  }
  if (level >= 3) {
    emitters.push({
      t: 0, acc: 0, rate: 90, duration: 3.5,
      emit: () => spawn(rand(0, innerWidth), -20, Math.PI / 2, rand(50, 250), true),
    });
  }
  if (level >= 2) {
    setTimeout(() => burst(innerWidth * 0.25, innerHeight * 0.45, 60, 1.1), 450);
    setTimeout(() => burst(innerWidth * 0.75, innerHeight * 0.45, 60, 1.1), 800);
  }

  // Banner
  const el = document.createElement('div');
  el.className = `win-fx lvl-${level}`;
  el.innerHTML = `
    <div class="flash"></div>
    <div class="rays"></div>
    <div class="win-inner">
      <div class="win-title">${TIERS[level].split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
      <div class="win-amount">+$0</div>
    </div>`;
  mount(el, duration);
  const amountEl = el.querySelector('.win-amount');
  const countDur = 900 + level * 500;
  const t0 = performance.now();
  (function count(now) {
    const u = Math.min((now - t0) / countDur, 1);
    amountEl.textContent = '+' + money(net * (1 - Math.pow(1 - u, 3)));
    if (u < 1 && el.isConnected) requestAnimationFrame(count);
    else amountEl.classList.add('done');
  })(t0);
}

// ---------- loss ----------
export function youDied({ lost, broke }) {
  const el = document.createElement('div');
  el.className = 'died';
  el.innerHTML = `
    <div class="died-band">
      <h1>YOU DIED</h1>
      <p>${broke ? 'Your wallet has been hollowed' : `${money(lost)} lost to the wheel`}</p>
    </div>`;
  mount(el, 4200);
}

const inGame = typeof window.GetParentResourceName === 'function';

const settings = {
  accent: '#11E9FF',
  inVehicle: !inGame,
  live: true,
  backdrop: inGame ? 'clear' : 'scene'
};

let bridge = inGame;
let visible = !inGame;

if (inGame) document.documentElement.classList.add('ingame');

const gearLimits = [40, 80, 125, 190, 260];
const gearNames = ['1', '2', '3', '4', '5', 'R'];

const car = {
  tick: 0,
  speed: 180,
  gear: null,
  rpm: 0.66,
  hp: 0.78,
  odo: 1111,
  fuel: 0.82,
  nitro: 0.2,
  water: 0.86,
  food: 0.64,
  armor: 155,
  spray: 155,
  playerId: 234,
  players: 1337,
  maxPlayers: 2000,
  cash: 1300000,
  bank: 1300000,
  street: 'Ocean Drive',
  zone: 'Vinewood Hills',
  roundLeft: 805,
  roundTotal: 1410,
  recSecs: 11,
  notif: { title: 'Success', text: 'Your vehicle was stored in the garage.' },
  notifUntil: 0,
  fam: { kills: 24, alive: 24 },
  bal: { kills: 24, alive: 24 },
  mic: false,
  belt: false,
  lights: false,
  locked: false,
  engine: true
};

if (inGame) {
  Object.assign(car, {
    speed: 0, rpm: 0, hp: 1, odo: 0, fuel: 1, nitro: 0, water: 1, food: 1,
    armor: 0, spray: 0, cash: 0, bank: 0, street: '', zone: '', engine: false
  });
}

const byId = (id) => document.getElementById(id);

const hud = byId('hud');
const scene = byId('scene');
const speedo = byId('speedo');
const notif = byId('notif');
const micOrb = byId('orb-mic');
const waterOrb = byId('orb-water');
const foodOrb = byId('orb-food');
const scoreFill = byId('score-fill');
const gearBox = byId('gears');

const buttons = {
  lights: byId('btn-lights'),
  locked: byId('btn-lock'),
  belt: byId('btn-belt'),
  engine: byId('btn-engine')
};

const fields = {};
document.querySelectorAll('[data-bind]').forEach((node) => {
  fields[node.dataset.bind] = node;
});

const vitalNums = document.querySelectorAll('.vitals .vital .num');
fields.armor = vitalNums[0];
fields.spray = vitalNums[1];

const gearEls = gearNames.map((name) => {
  const span = document.createElement('span');
  span.className = 'gear';
  span.textContent = name;
  gearBox.appendChild(span);
  return span;
});

function two(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

function money(n) {
  return Math.round(n).toLocaleString('en-US') + ' $';
}

function currentGear(speed) {
  const i = gearLimits.findIndex((limit) => speed < limit);
  return i === -1 ? gearLimits.length - 1 : i;
}

function gearIndex() {
  if (car.gear === 'R') return gearNames.length - 1;
  if (typeof car.gear === 'number') {
    return Math.min(gearLimits.length, Math.max(1, Math.round(car.gear))) - 1;
  }
  return currentGear(car.speed);
}

function setText(name, value) {
  if (fields[name]) fields[name].textContent = value;
}

function update() {
  if (bridge || settings.live === false) return;

  const tick = car.tick + 1;
  const wanted = car.engine
    ? Math.max(0, 118 + 72 * Math.sin(tick * 0.045) + 24 * Math.sin(tick * 0.17))
    : 0;
  const speed = car.speed + (wanted - car.speed) * 0.3;

  const gear = currentGear(speed);
  const from = gear > 0 ? gearLimits[gear - 1] : 0;
  const progress = Math.min(1, Math.max(0, (speed - from) / (gearLimits[gear] - from)));
  const wantedRpm = car.engine ? 0.28 + 0.62 * progress : 0;

  if (tick % 40 === 0) {
    if (Math.floor(tick / 40) % 2 === 1) {
      car.fam.kills++;
      car.bal.alive = Math.max(8, car.bal.alive - 1);
    } else {
      car.bal.kills++;
      car.fam.alive = Math.max(8, car.fam.alive - 1);
    }
  }

  car.tick = tick;
  car.speed = speed;
  car.rpm += (wantedRpm - car.rpm) * 0.35;
  car.hp = 0.78 + 0.04 * Math.sin(tick * 0.02);
  car.odo += (speed / 3.6) * 0.15;
  car.mic = Math.sin(tick * 0.09) > 0.35 || Math.sin(tick * 0.31) > 0.8;
}

function draw() {
  const demo = !bridge && settings.live !== false;
  const clock = bridge || settings.live !== false;
  const hex = /^#([0-9a-f]{6})$/i.exec(settings.accent);
  const rgb = hex
    ? [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).join(',')
    : '17,233,255';

  const now = new Date();
  const secs = Math.floor(car.tick * 0.15);
  const roundTotal = bridge ? car.roundTotal || 1410 : 1410;
  const roundLeft = bridge
    ? Math.min(roundTotal, Math.max(0, car.roundLeft))
    : (((805 - secs) % 1410) + 1410) % 1410;
  const recSecs = bridge ? car.recSecs : 11 + secs;

  const odo = String(Math.floor(car.odo)).padStart(7, '0');
  const zeros = /^0*/.exec(odo)[0];

  const nitro = bridge ? car.nitro : 0.2 + 0.15 * (demo ? (Math.sin(car.tick * 0.05) + 1) / 2 : 0);
  const fuel = bridge ? car.fuel : Math.max(0.05, 0.82 - car.tick * 0.00003);
  const water = bridge ? car.water : Math.max(0.2, 0.86 - car.tick * 0.00008);
  const food = bridge ? car.food : Math.max(0.2, 0.64 - car.tick * 0.00005);
  const showNotif = bridge
    ? Date.now() < car.notifUntil
    : demo
      ? (car.tick * 150) % 9000 < 5300
      : true;

  hud.style.setProperty('--accent', settings.accent);
  hud.style.setProperty('--accent-rgb', rgb);
  hud.classList.toggle('hidden', !visible);
  scene.classList.toggle('plain', settings.backdrop === 'plain');
  scene.classList.toggle('clear', settings.backdrop === 'clear');
  speedo.classList.toggle('off', settings.inVehicle === false);
  notif.classList.toggle('on', showNotif);
  micOrb.classList.toggle('talk', car.mic);

  setText('famKills', car.fam.kills);
  setText('famAlive', car.fam.alive);
  setText('balKills', car.bal.kills);
  setText('balAlive', car.bal.alive);
  setText('roundLabel', two(roundLeft / 60) + ':' + two(roundLeft % 60));
  setText('recTime', '00:' + two(recSecs / 60) + ':' + two(recSecs % 60));
  setText('clockLabel', clock ? two(now.getHours()) + ':' + two(now.getMinutes()) : '23:45');
  setText(
    'dateLabel',
    clock
      ? two(now.getDate()) + ' / ' + two(now.getMonth() + 1) + ' / ' + now.getFullYear()
      : '07 / 07 / 2024'
  );
  setText('speed', Math.round(car.speed));
  setText('nitroN', Math.round(nitro * 100));
  setText('fuelL', Math.round(fuel * 100));
  setText('odoZeros', zeros);
  setText('odoDigits', odo.slice(zeros.length));
  setText('armor', Math.round(car.armor));
  setText('spray', Math.round(car.spray));
  setText('playerId', car.playerId);
  setText('playersLabel', car.players + ' / ' + car.maxPlayers);
  setText('cash', money(car.cash));
  setText('bank', money(car.bank));
  setText('street', car.street);
  setText('zone', car.zone);
  setText('notifTitle', car.notif.title);
  setText('notifText', car.notif.text);

  scoreFill.style.setProperty('--p', ((1 - roundLeft / roundTotal) * 100).toFixed(2));
  waterOrb.style.setProperty('--v', (water * 100).toFixed(2));
  foodOrb.style.setProperty('--v', (food * 100).toFixed(2));
  speedo.style.setProperty('--nitro', (nitro * 100).toFixed(2));
  speedo.style.setProperty('--fuel', (fuel * 100).toFixed(2));
  speedo.style.setProperty('--rpm', (Math.max(0.01, car.rpm) * 100).toFixed(2));
  speedo.style.setProperty('--hp', (car.hp * 100).toFixed(2));

  const gear = gearIndex();
  gearEls.forEach((el, i) => {
    let state = 'next';
    if (i === gear) state = 'act';
    else if (gearNames[i] === 'R') state = 'dim';
    else if (i < gear) state = 'past';
    el.className = 'gear ' + state;
  });

  for (const key in buttons) {
    buttons[key].classList.toggle('on', car[key]);
    buttons[key].setAttribute('aria-pressed', String(car[key]));
  }
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const RATIO_KEYS = ['rpm', 'hp', 'fuel', 'nitro', 'water', 'food'];
const NUM_KEYS = [
  'speed', 'odo', 'armor', 'spray', 'playerId', 'players', 'maxPlayers',
  'cash', 'bank', 'roundLeft', 'roundTotal', 'recSecs'
];
const BOOL_KEYS = ['engine', 'lights', 'locked', 'belt', 'mic'];
const STR_KEYS = ['street', 'zone'];

function applyUpdate(d) {
  RATIO_KEYS.forEach((k) => { if (isNum(d[k])) car[k] = clamp01(d[k]); });
  NUM_KEYS.forEach((k) => { if (isNum(d[k])) car[k] = Math.max(0, d[k]); });
  BOOL_KEYS.forEach((k) => { if (typeof d[k] === 'boolean') car[k] = d[k]; });
  STR_KEYS.forEach((k) => { if (typeof d[k] === 'string') car[k] = d[k].slice(0, 40); });

  if (d.gear === 'R' || isNum(d.gear)) car.gear = d.gear;
  if (typeof d.inVehicle === 'boolean') settings.inVehicle = d.inVehicle;

  ['fam', 'bal'].forEach((team) => {
    if (d[team] && typeof d[team] === 'object') {
      if (isNum(d[team].kills)) car[team].kills = d[team].kills;
      if (isNum(d[team].alive)) car[team].alive = d[team].alive;
    }
  });
}

function showNotification(d) {
  if (typeof d.title === 'string') car.notif.title = d.title.slice(0, 40);
  if (typeof d.text === 'string') car.notif.text = d.text.slice(0, 160);
  const ms = isNum(d.duration) && d.duration > 0 ? d.duration : 5000;
  car.notifUntil = Date.now() + ms;
  notif.classList.remove('on');
  void notif.offsetWidth;
  notif.style.setProperty('--notif-time', ms + 'ms');
}

window.addEventListener('message', (event) => {
  const d = event.data;
  if (!d || typeof d.type !== 'string') return;

  switch (d.type) {
    case 'hud:update':
      bridge = true;
      applyUpdate(d);
      break;
    case 'hud:notify':
      bridge = true;
      showNotification(d);
      break;
    case 'hud:visible':
      visible = d.show !== false;
      break;
    case 'hud:config':
      if (typeof d.accent === 'string' && /^#[0-9a-f]{6}$/i.test(d.accent)) {
        settings.accent = d.accent;
      }
      if (['scene', 'plain', 'clear'].includes(d.backdrop)) settings.backdrop = d.backdrop;
      break;
    default:
      return;
  }
  draw();
});

for (const key in buttons) {
  buttons[key].addEventListener('click', () => {
    if (bridge) return;
    car[key] = !car[key];
    draw();
  });
}

draw();
setInterval(() => {
  update();
  draw();
}, 150);

// =====================================================
// game.js – Oravapelin pelilogiikka
// =====================================================

// ---- Vakiot ----
const CANVAS_W       = 480;
const CANVAS_H       = 500;
const SQUIRREL_W     = 80;    // #squirrel-elementin leveys px (vastaa SVG-suhteita)
const SQUIRREL_SPEED = 6;     // pikseliä per frame
const NUT_DRAW_SIZE  = 48;    // pähkinäkuvan koko canvasilla (px, neliö)
const NUT_RADIUS     = 17;    // törmäyssäde (px)
const NUT_BASE_SPEED = 2.5;
const NUT_SPEED_INC  = 0.3;   // nopeuslisäys / 10 s
const SPAWN_INTERVAL = 90;    // frame-väli pähkinä-spawnille (alussa)
const MAX_LIVES      = 3;

// ---- Pelitila ----
let score      = 0;
let lives      = MAX_LIVES;
let gameOver   = false;
let frameCount = 0;
let nuts       = [];
let squirrelX  = CANVAS_W / 2 - SQUIRREL_W / 2;
let keys       = {};

// ---- Esikuormitetut kuvat ----
let bgImg     = null;   // assets/bg_forest.svg
let acornImg  = null;   // assets/acorn.svg    (tavallinen pähkinä, 1 piste)
let goldenImg = null;   // assets/nut_golden.svg (kultapähkinä, 3 pistettä)

// ---- DOM-viittaukset ----
const canvas      = document.getElementById('game-canvas');
const ctx         = canvas.getContext('2d');
const squirrelEl  = document.getElementById('squirrel');
const overlay     = document.getElementById('overlay');
const finalScoreEl = document.getElementById('final-score-display');
const scoreEl     = document.getElementById('score');
const livesEl     = document.getElementById('lives-display');
const restartBtn  = document.getElementById('restart-btn');

// ---- Näppäimistö ----
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup',   e => { keys[e.key] = false; });

// ---- Kuvanlataus ----
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadImages() {
  return Promise.all([
    loadImage('assets/bg_forest.svg'),
    loadImage('assets/acorn.svg'),
    loadImage('assets/nut_golden.svg'),
  ]).then(([bg, acorn, golden]) => {
    bgImg    = bg;
    acornImg = acorn;
    goldenImg = golden;
  });
}

// ---- Vaikeustasojen laskenta ----

function currentNutSpeed() {
  const steps = Math.floor(frameCount / (60 * 10));
  return NUT_BASE_SPEED + steps * NUT_SPEED_INC;
}

function currentSpawnInterval() {
  const steps = Math.floor(frameCount / (60 * 10));
  return Math.max(35, SPAWN_INTERVAL - steps * 5);
}

// ---- Pähkinöiden hallinta ----

function spawnNut() {
  const margin = NUT_DRAW_SIZE / 2;
  const x      = margin + Math.random() * (CANVAS_W - NUT_DRAW_SIZE);
  // 15 % todennäköisyydellä kultapähkinä (3 pistettä)
  const golden = Math.random() < 0.15;
  nuts.push({ x, y: -margin, speed: currentNutSpeed(), golden });
}

// ---- HUD-päivitys ----

function updateHUD() {
  scoreEl.textContent = `Pisteet: ${score}`;

  // Rakenna elämäikonit ui_life.svg-kuvista
  livesEl.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const img = document.createElement('img');
    img.src       = 'assets/ui_life.svg';
    img.alt       = '';
    img.className = i < lives ? 'life-icon' : 'life-icon life-lost';
    livesEl.appendChild(img);
  }
}

// ---- Piirtofunktiot ----

function drawBackground() {
  if (bgImg) {
    // Venytä bg_forest.svg täyttämään canvas (960×600 → 480×500)
    ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    ctx.fillStyle = '#FCEFD6';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

function drawNut(nut) {
  const img  = nut.golden ? goldenImg : acornImg;
  const half = NUT_DRAW_SIZE / 2;
  if (img) {
    ctx.drawImage(img, nut.x - half, nut.y - half, NUT_DRAW_SIZE, NUT_DRAW_SIZE);
  } else {
    // Fallback jos kuva ei ole ladattu
    ctx.fillStyle = nut.golden ? '#F4C84B' : '#8B5E3C';
    ctx.beginPath();
    ctx.arc(nut.x, nut.y, NUT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Liikuta oravaa: VAIN DOM-muutos, ei koskaan canvas-piirtoa.
// Orava on inline-SVG #squirrel-divissä (index.html).
// Väri tulee CSS-muuttujasta var(--orava-fur) joka on :root:ssa style.css:ssä.
function renderSquirrel() {
  squirrelEl.style.transform = `translateX(${squirrelX}px)`;
  if (keys['ArrowLeft'])       squirrelEl.classList.add('facing-left');
  else if (keys['ArrowRight']) squirrelEl.classList.remove('facing-left');
}

// ---- Törmäystarkistus (AABB, ottaa huomioon oravan todellisen sijainnin SVG:ssä) ----
// squirrel.svg viewBox 128×128, näytetään 80px:
//   vaakasuunta: keho x≈13–108 → skaalattuna x≈8–67 elementissä
//   pystysuunta:  keho y≈26–109 → skaalattuna y≈16–68 elementissä
function collides(nut) {
  const elemTop = CANVAS_H - 4 - SQUIRREL_W;  // CSS: bottom:4px
  const sx = squirrelX + 8;                    // kehon vasen reuna
  const sw = SQUIRREL_W - 18;                  // kehon leveys (~62 px)
  const sy = elemTop + 16;                     // kehon yläreuna
  const sh = 52;                               // kehon korkeus
  return (
    nut.x + NUT_RADIUS > sx &&
    nut.x - NUT_RADIUS < sx + sw &&
    nut.y + NUT_RADIUS > sy &&
    nut.y - NUT_RADIUS < sy + sh
  );
}

// ---- Pelin päivitys ----

function update() {
  if (gameOver) return;
  frameCount++;

  // Liiku
  if (keys['ArrowLeft'])  squirrelX = Math.max(0, squirrelX - SQUIRREL_SPEED);
  if (keys['ArrowRight']) squirrelX = Math.min(CANVAS_W - SQUIRREL_W, squirrelX + SQUIRREL_SPEED);

  // Spawnaanko uusi pähkinä?
  if (frameCount % currentSpawnInterval() === 0) spawnNut();

  // Päivitä pähkinät
  for (let i = nuts.length - 1; i >= 0; i--) {
    const nut = nuts[i];
    nut.y += nut.speed;

    if (collides(nut)) {
      score += nut.golden ? 3 : 1;
      nuts.splice(i, 1);
      updateHUD();
    } else if (nut.y - NUT_DRAW_SIZE / 2 > CANVAS_H) {
      // Putosi maahan – menetä elämä
      nuts.splice(i, 1);
      lives--;
      updateHUD();
      if (lives <= 0) { endGame(); return; }
    }
  }
}

// ---- Renderöinti ----

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground();
  nuts.forEach(drawNut);
  renderSquirrel();
}

// ---- Pelin loppu ----

function endGame() {
  gameOver = true;
  finalScoreEl.textContent = score;
  overlay.classList.remove('hidden');
}

// ---- Uudelleenaloitus ----

function restartGame() {
  score      = 0;
  lives      = MAX_LIVES;
  frameCount = 0;
  gameOver   = false;
  nuts       = [];
  squirrelX  = CANVAS_W / 2 - SQUIRREL_W / 2;
  keys       = {};
  squirrelEl.classList.remove('facing-left');
  updateHUD();
  overlay.classList.add('hidden');
  loop();
}

restartBtn.addEventListener('click', restartGame);

// ---- Pääsilmukka ----

function loop() {
  if (gameOver) return;
  update();
  render();
  requestAnimationFrame(loop);
}

// ---- Käynnistys: ensin kuvat, sitten peli ----
updateHUD();
loadImages()
  .then(loop)
  .catch(() => {
    // Jatka ilman kuvia jos lataus epäonnistuu (esim. file://-protokolla)
    loop();
  });

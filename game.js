// ====== game.js ======

// Canvas setup
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Canvas size
const WIDTH = 400;
const HEIGHT = 300;

const STREET_HEIGHT = 30;
const ROAD_EXTENSION = 50;
const BASELINE_INSET = 45;

const ROAD_TOP = HEIGHT - STREET_HEIGHT - ROAD_EXTENSION;
const GROUND_Y = ROAD_TOP + BASELINE_INSET;

// Game states
const STATE = { TITLE: 0, PLAYING: 1, GAMEOVER: 2 };
let gameState = STATE.TITLE;

// Input
let spaceHeld = false;

// Speed system
let baseSpeed = 3;
let currentSpeed = 3;
let speedTimer = 0;

// Score
let score = 0;
let highScore = parseInt(localStorage.getItem("grannyHighScore") || "0");

// Blink
let blinkTimer = 0;
let showBlink = true;

// Screen shake
let shakeFrames = 0;
const SHAKE_DURATION = 12;  // frames
const SHAKE_MAGNITUDE = 4;  // pixels

// Double jump
let hasDoubleJumped = false;

// Images
const images = {};

// Font
// charWidth is the actual pixel width of each glyph in the sprite sheet.
// CHAR_STRIDE is the horizontal advance per character when rendering (glyph + 1px kerning gap).
const bitmapFont = {
  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?.",
  charWidth: 8,
  charHeight: 10,
  stride: 9  // advance per character = charWidth + 1px gap
};

// ===== AUDIO =====
const audio = {
  title: new Audio("assets/titleloop.wav"),
  game: new Audio("assets/song.wav"),
  jump: new Audio("assets/jump.wav"),
  land: new Audio("assets/land.wav"),
  hit: new Audio("assets/hit.wav"),
  select: new Audio("assets/select.wav")
};

Object.values(audio).forEach(a => {
  a.preload = "auto";
  a.volume = 0.8;
});

audio.title.loop = true;
audio.game.loop = true;

// required for browser autoplay rules
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audio.title.play().catch(() => {});
}

function playSound(s) {
  if (!audioUnlocked) return;
  try {
    audio[s].currentTime = 0;
    audio[s].play().catch(() => {});
  } catch (e) {}
}

function startMusic(mode) {
  // Pause all non-sfx tracks
  [audio.title, audio.game].forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
  if (mode === "title") audio.title.play().catch(() => {});
  if (mode === "game")  audio.game.play().catch(() => {});
  // mode === "stop" just leaves everything paused
}

// ===== Granny =====
const granny = {
  x: 30,
  feetY: GROUND_Y,
  width: 106,
  height: 150,
  vy: 0,
  gravity: 0.5,
  jumpPower: -11,
  grounded: true,
  frame: 0,
  frameTimer: 0,
  state: "idle"
};

const GRANNY_HITBOX = { x: 40, y: 40, width: 35, height: 95 };

// Obstacles
const obstacles = [];
let obstacleTimer = 0;
let nextObstacleGap = randomGap();

// Road line scroll offset
let lineOffset = 0;

// ===== OBSTACLE CONFIG =====
// Defined once; used for both image loading and spawning.
const obstacleFiles = [
  { name: "cone",    width: 25, height: 45, src: "assets/cone.png" },
  { name: "manhole", width: 50, height: 17, src: "assets/manhole.png" },
  { name: "trash",   width: 40, height: 60, src: "assets/trash.png" }
];

// ===== INPUT =====
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;

  unlockAudio();

  if (spaceHeld) return;
  spaceHeld = true;

  if (gameState === STATE.TITLE) {
    playSound("select");   // UI confirm sound: title screen only
    startGame();
    return;
  }

  if (gameState === STATE.GAMEOVER) {
    playSound("select");   // UI confirm sound: game over screen only
    resetGame();
    startGame();
    return;
  }

  // During gameplay: no select sound — only the jump pipeline plays sounds
  if (gameState === STATE.PLAYING && granny.state === "idle") {
    granny.state = "anticipation";
    granny.frameTimer = 0;
    return;
  }

  // Double jump: allowed while airborne and not yet used
  if (gameState === STATE.PLAYING && granny.state === "jump" && !hasDoubleJumped) {
    hasDoubleJumped = true;
    granny.vy = granny.jumpPower * 0.85;  // slightly weaker than first jump
    playSound("jump");
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceHeld = false;
});

// ===== PRELOAD =====
const fgBuildingFiles = ["fg_building1.png","fg_building2.png","fg_building3.png","fg_building4.png","fg_building5.png"];
const bgBuildingFiles = ["bg_building1.png","bg_building2.png","bg_building3.png","bg_building4.png","bg_building5.png"];

const imagesToLoad = [
  { name: "title",  src: "assets/titlescreen.png" },
  { name: "granny", src: "assets/granny_jump.png" },
  { name: "clouds", src: "assets/clouds.png" },
  { name: "font",   src: "assets/font.png" }
];

fgBuildingFiles.forEach((f, i) => imagesToLoad.push({ name: "fg" + (i + 1), src: "assets/" + f }));
bgBuildingFiles.forEach((f, i) => imagesToLoad.push({ name: "bg" + (i + 1), src: "assets/" + f }));
obstacleFiles.forEach(o => imagesToLoad.push({ name: o.name, src: o.src }));

let loadedCount = 0;
imagesToLoad.forEach(imgData => {
  const img = new Image();
  img.src = imgData.src;
  img.onload = () => {
    loadedCount++;
    if (loadedCount === imagesToLoad.length) {
      initLayers();
      requestAnimationFrame(loop);
    }
  };
  images[imgData.name] = img;
});

// ===== LAYERS =====
let distantBuildings = [];
let foregroundBuildings = [];

function initLayers() {
  let xPos = 0;
  while (xPos < WIDTH + 200) {
    const img = images["bg" + (Math.floor(Math.random() * 5) + 1)];
    distantBuildings.push({ image: img, x: xPos, y: HEIGHT - STREET_HEIGHT - img.height - 40 });
    xPos += img.width;
  }

  xPos = 0;
  while (xPos < WIDTH + 200) {
    const img = images["fg" + (Math.floor(Math.random() * 5) + 1)];
    foregroundBuildings.push({ image: img, x: xPos, y: ROAD_TOP - img.height });
    xPos += img.width;
  }
}

// ===== RESET =====
function resetGame() {
  obstacles.length = 0;
  obstacleTimer = 0;
  nextObstacleGap = randomGap();

  granny.feetY = GROUND_Y;
  granny.vy = 0;
  granny.state = "idle";
  granny.frame = 0;
  granny.frameTimer = 0;
  granny.grounded = true;

  hasDoubleJumped = false;
  shakeFrames = 0;

  lineOffset = 0;

  baseSpeed = 3;
  currentSpeed = 3;
  speedTimer = 0;

  score = 0;
  // Note: do NOT call startMusic here. The caller (keydown handler) plays
  // the select sound, then startGame() sets the correct music.
}

// ===== START =====
function startGame() {
  gameState = STATE.PLAYING;
  startMusic("game");
}

// ===== LOOP =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===== UPDATE =====
function update() {
  blinkTimer++;
  if (blinkTimer > 25) {
    blinkTimer = 0;
    showBlink = !showBlink;
  }

  if (gameState !== STATE.PLAYING) return;

  // Speed ramp: increase base speed every 2 seconds (120 frames at 60fps)
  speedTimer++;
  if (speedTimer > 120) {
    speedTimer = 0;
    baseSpeed += 0.2;
  }
  currentSpeed = baseSpeed;

  score++;

  granny.frameTimer++;

  // ===== GRANNY ANIMATION =====
  if (granny.state === "anticipation") {
    granny.frame = 1;
    if (granny.frameTimer > 5) {
      granny.vy = granny.jumpPower;
      granny.state = "jump";
      granny.frameTimer = 0;
      playSound("jump");
    }
  }
  else if (granny.state === "jump") {
    granny.vy += granny.gravity;
    granny.feetY += granny.vy;

    if      (granny.vy < -6) granny.frame = 2;
    else if (granny.vy < -2) granny.frame = 3;
    else if (granny.vy <  0) granny.frame = 4;
    else                     granny.frame = 5;

    if (granny.feetY >= GROUND_Y) {
      granny.feetY = GROUND_Y;
      granny.vy = 0;
      granny.state = "landing";
      granny.frame = 6;
      granny.frameTimer = 0;
      granny.grounded = true;
      hasDoubleJumped = false;
      playSound("land");
    } else {
      granny.grounded = false;
    }
  }
  else if (granny.state === "landing") {
    if (granny.frameTimer > 4) {
      granny.frame++;
      granny.frameTimer = 0;
      if (granny.frame > 8) {
        granny.frame = 0;
        granny.state = "idle";
      }
    }
  }
  else if (granny.state === "idle") {
    granny.frame = 0;
    granny.grounded = true;
  }

  // Granny hitbox in world space
  const grannyBox = {
    x:      granny.x + GRANNY_HITBOX.x,
    y:      (granny.feetY - granny.height) + GRANNY_HITBOX.y,
    width:  GRANNY_HITBOX.width,
    height: GRANNY_HITBOX.height
  };

  // Scroll buildings
  distantBuildings.forEach(b  => b.x -= currentSpeed * 0.2);
  foregroundBuildings.forEach(b => b.x -= currentSpeed);

  // Recycle foreground buildings
  if (foregroundBuildings.length && foregroundBuildings[0].x + foregroundBuildings[0].image.width < 0) {
    foregroundBuildings.shift();
    const img  = images["fg" + (Math.floor(Math.random() * 5) + 1)];
    const last = foregroundBuildings[foregroundBuildings.length - 1];
    foregroundBuildings.push({ image: img, x: last.x + last.image.width, y: ROAD_TOP - img.height });
  }

  // Recycle distant buildings
  if (distantBuildings.length && distantBuildings[0].x + distantBuildings[0].image.width < 0) {
    distantBuildings.shift();
    const img  = images["bg" + (Math.floor(Math.random() * 5) + 1)];
    const last = distantBuildings[distantBuildings.length - 1];
    distantBuildings.push({ image: img, x: last.x + last.image.width, y: HEIGHT - STREET_HEIGHT - img.height - 40 });
  }

  // Spawn obstacles
  obstacleTimer++;
  if (obstacleTimer > nextObstacleGap) {
    obstacleTimer = 0;
    nextObstacleGap = randomGap();
    const choice = obstacleFiles[Math.floor(Math.random() * obstacleFiles.length)];
    obstacles.push({
      x: WIDTH,
      y: GROUND_Y - choice.height,
      width:  choice.width,
      height: choice.height,
      name:   choice.name
    });
  }

  obstacles.forEach(o => o.x -= currentSpeed);

  // Collision detection
  for (const o of obstacles) {
    if (checkCollision(grannyBox, o)) {
      gameState = STATE.GAMEOVER;
      shakeFrames = SHAKE_DURATION;
      playSound("hit");
      startMusic("stop");
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("grannyHighScore", highScore);
      }
      return;
    }
  }
}

// ===== DRAW =====
function draw() {
  if (gameState === STATE.TITLE) {
    drawTitle();
    return;
  }

  ctx.save();
  if (shakeFrames > 0) {
    shakeFrames--;
    const dx = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE;
    const dy = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE;
    ctx.translate(dx, dy);
  }

  ctx.fillStyle = "#8dc2e3";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawGame();
  drawScore();

  if (gameState === STATE.GAMEOVER) {
    drawGameOverOverlay();
  }

  ctx.restore();
}

// ===== SCORE =====
function drawScore() {
  const s  = String(Math.floor(score     / 60)).padStart(2, "0");
  const hs = String(Math.floor(highScore / 60)).padStart(2, "0");

  const hiLabel  = "HI SCORE " + hs;
  const scoreStr = s;

  // Right-align by computing pixel width and subtracting from right edge
  const MARGIN = 8;
  const hiWidth    = hiLabel.length  * bitmapFont.stride;
  const scoreWidth = scoreStr.length * bitmapFont.stride;

  drawBitmapText(hiLabel,  WIDTH - MARGIN - hiWidth,    12);
  drawBitmapText(scoreStr, WIDTH - MARGIN - scoreWidth, 24);
}

// ===== GAME OVER =====
function drawGameOverOverlay() {
  const lines = ["GAME OVER", "PLAY AGAIN?"];
  const padding    = 10;
  const lineHeight = bitmapFont.charHeight + 6;

  // Use stride for accurate pixel width
  let maxWidth = 0;
  lines.forEach(line => {
    // Last char doesn't need trailing gap, so: (len-1)*stride + charWidth
    const w = (line.length - 1) * bitmapFont.stride + bitmapFont.charWidth;
    if (w > maxWidth) maxWidth = w;
  });

  const boxWidth  = maxWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;
  const x = (WIDTH  - boxWidth)  / 2;
  const y = (HEIGHT - boxHeight) / 2;

  ctx.fillStyle   = "black";
  ctx.fillRect(x, y, boxWidth, boxHeight);

  ctx.strokeStyle = "white";
  ctx.lineWidth   = 4;
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  lines.forEach((line, i) => {
    // Accurate centering using stride
    const textWidth = (line.length - 1) * bitmapFont.stride + bitmapFont.charWidth;
    const tx = (WIDTH - textWidth) / 2;
    drawBitmapText(line, tx, y + padding + i * lineHeight);
  });
}

// ===== BITMAP TEXT =====
function drawBitmapText(text, x, y) {
  text = text.toUpperCase();
  for (let i = 0; i < text.length; i++) {
    const index = bitmapFont.chars.indexOf(text[i]);
    if (index === -1) continue;
    ctx.drawImage(
      images.font,
      index * bitmapFont.charWidth, 0,      // source x, y
      bitmapFont.charWidth, bitmapFont.charHeight, // source w, h
      x + i * bitmapFont.stride, y,          // dest x, y
      bitmapFont.charWidth, bitmapFont.charHeight  // dest w, h
    );
  }
}

// ===== TITLE =====
function drawTitle() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const img = images.title;
  if (img.complete) {
    ctx.drawImage(img, (WIDTH - 363) / 2, (HEIGHT - 222) / 2 - 10);
  }

 if (showBlink) {
    const text = "PRESS BUTTON TO START";
    const textWidth = (text.length - 1) * bitmapFont.stride + bitmapFont.charWidth;
    drawBitmapText(text, (WIDTH - textWidth) / 2, 250);
  }
}

// ===== GAME =====
function drawGame() {
  ctx.drawImage(images.clouds, 0, 20);
  distantBuildings.forEach(b  => ctx.drawImage(b.image, b.x, b.y));
  foregroundBuildings.forEach(b => ctx.drawImage(b.image, b.x, b.y));

  ctx.fillStyle = "#867e7c";
  ctx.fillRect(0, ROAD_TOP, WIDTH, STREET_HEIGHT + ROAD_EXTENSION);

  drawRoadLine();

  obstacles.forEach(o => {
    ctx.drawImage(images[o.name], o.x, o.y, o.width, o.height);
  });

  const drawY = granny.feetY - granny.height;
  const sx    = granny.frame * granny.width;
  ctx.drawImage(images.granny, sx, 0, granny.width, granny.height, granny.x, drawY, granny.width, granny.height);
}

// ===== ROAD LINE =====
function drawRoadLine() {
  const DASH  = 48;
  const GAP   = 108;
  const CYCLE = DASH + GAP;

  if (gameState === STATE.PLAYING) {
    lineOffset -= currentSpeed;
  }

  ctx.fillStyle = "#fef752";

  for (let i = 0; i < WIDTH / CYCLE + 2; i++) {
    ctx.fillRect(i * CYCLE + (lineOffset % CYCLE), HEIGHT - 25, DASH, 3);
  }
}

// ===== UTIL =====
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width  &&
    a.x + a.width  > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function randomGap() {
  return 80 + Math.random() * 220;
}

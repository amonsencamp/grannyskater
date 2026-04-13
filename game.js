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

const ROAD_TOP = HEIGHT - STREET_HEIGHT - ROAD_EXTENSION;
const GROUND_Y = ROAD_TOP + 45;

// Game states
const STATE = { TITLE: 0, PLAYING: 1, GAMEOVER: 2 };
let gameState = STATE.TITLE;

// Input
let spaceHeld = false;

// Speed system
let baseSpeed = 3;
let currentSpeed = 3;
let speedTimer = 0;

// Score (seconds only)
let scoreFrames = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem("grannyHighScore") || "0");

// Blink
let blinkTimer = 0;
let showBlink = true;

// Images
const images = {};

// Font
const bitmapFont = {
  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?.",
  charWidth: 8,
  charHeight: 10
};

// ===== GRANNY =====
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

// ===== OBSTACLES =====
const obstacles = [];
let obstacleTimer = 0;
let nextObstacleGap = randomGap();

// ===== INPUT =====
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  if (spaceHeld) return;
  spaceHeld = true;

  if (gameState === STATE.TITLE) {
    startGame();
    return;
  }

  if (gameState === STATE.GAMEOVER) {
    resetGame();
    startGame();
    return;
  }

  if (gameState === STATE.PLAYING && granny.grounded && granny.state === "idle") {
    granny.state = "anticipation";
    granny.frameTimer = 0;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceHeld = false;
});

// ===== PRELOAD =====
const fgBuildingFiles = ["fg_building1.png","fg_building2.png","fg_building3.png","fg_building4.png","fg_building5.png"];
const bgBuildingFiles = ["bg_building1.png","bg_building2.png","bg_building3.png","bg_building4.png","bg_building5.png"];

const obstacleFiles = [
  { name: "cone", width: 25, height: 45, src: "assets/cone.png" },
  { name: "manhole", width: 50, height: 17, src: "assets/manhole.png" },
  { name: "trash", width: 40, height: 60, src: "assets/trash.png" }
];

const imagesToLoad = [
  { name: "title", src: "assets/titlescreen.png" },
  { name: "granny", src: "assets/granny_jump.png" },
  { name: "clouds", src: "assets/clouds.png" },
  { name: "font", src: "assets/font.png" }
];

fgBuildingFiles.forEach((f,i)=>imagesToLoad.push({name:"fg"+(i+1),src:"assets/"+f}));
bgBuildingFiles.forEach((f,i)=>imagesToLoad.push({name:"bg"+(i+1),src:"assets/"+f}));
obstacleFiles.forEach(o=>imagesToLoad.push({name:o.name,src:o.src}));

let loadedCount = 0;
imagesToLoad.forEach(imgData=>{
  const img = new Image();
  img.src = imgData.src;
  img.onload = ()=>{
    loadedCount++;
    if (loadedCount === imagesToLoad.length){
      initLayers();
      requestAnimationFrame(loop);
    }
  };
  images[imgData.name] = img;
});

// ===== LAYERS =====
let cloudsLayer = { image:null, x:0, y:20 };
let distantBuildings = [];
let foregroundBuildings = [];

function initLayers(){
  cloudsLayer.image = images.clouds;

  let xPos = 0;
  while(xPos < WIDTH + 200){
    const img = images["bg"+(Math.floor(Math.random()*5)+1)];
    distantBuildings.push({
      image: img,
      x: xPos,
      y: HEIGHT - STREET_HEIGHT - img.height - 40
    });
    xPos += img.width;
  }

  xPos = 0;
  while(xPos < WIDTH + 200){
    const img = images["fg"+(Math.floor(Math.random()*5)+1)];
    foregroundBuildings.push({
      image: img,
      x: xPos,
      y: ROAD_TOP - img.height
    });
    xPos += img.width;
  }
}

// ===== RESET =====
function resetGame(){
  obstacles.length = 0;
  obstacleTimer = 0;
  nextObstacleGap = randomGap();

  granny.feetY = GROUND_Y;
  granny.vy = 0;
  granny.state = "idle";
  granny.frame = 0;
  granny.frameTimer = 0;
  granny.grounded = true;

  lineOffset = 0;

  baseSpeed = 3;
  currentSpeed = 3;
  speedTimer = 0;

  scoreFrames = 0;
  score = 0;
}

// ===== START =====
function startGame(){
  gameState = STATE.PLAYING;
}

// ===== LOOP =====
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===== UPDATE =====
function update(){

  blinkTimer++;
  if (blinkTimer > 25){
    blinkTimer = 0;
    showBlink = !showBlink;
  }

  if (gameState !== STATE.PLAYING) return;

  // ===== SPEED =====
  speedTimer++;
  if (speedTimer > 120){
    speedTimer = 0;
    baseSpeed += 0.15;
  }
  currentSpeed = baseSpeed;

  // ===== SCORE (SECONDS ONLY) =====
  scoreFrames++;
  score = Math.floor(scoreFrames / 60);

  // ===== GRAVITY / JUMP =====
  granny.frameTimer++;

  if (granny.state === "anticipation"){
    granny.frame = 1;

    if (granny.frameTimer > 5){
      granny.vy = granny.jumpPower;
      granny.state = "jump";
      granny.frameTimer = 0;
    }
  }

  else if (granny.state === "jump"){
    granny.vy += granny.gravity;
    granny.feetY += granny.vy;

    // --- RESTORED SPRITE ANIMATION ---
    if (granny.vy < -6) granny.frame = 2;
    else if (granny.vy < -2) granny.frame = 3;
    else if (granny.vy < 2) granny.frame = 4;
    else granny.frame = 5;

    if (granny.feetY >= GROUND_Y){
      granny.feetY = GROUND_Y;
      granny.vy = 0;
      granny.state = "landing";
      granny.frameTimer = 0;
      granny.grounded = true;
    } else {
      granny.grounded = false;
    }
  }

  else if (granny.state === "landing"){
    if (granny.frameTimer > 4){
      granny.frame++;
      granny.frameTimer = 0;
      if (granny.frame > 6){
        granny.frame = 0;
        granny.state = "idle";
      }
    }
  }

  else if (granny.state === "idle"){
    granny.frame = 0;
    granny.grounded = true;
  }

  const grannyBox = {
    x: granny.x + GRANNY_HITBOX.x,
    y: (granny.feetY - granny.height) + GRANNY_HITBOX.y,
    width: GRANNY_HITBOX.width,
    height: GRANNY_HITBOX.height
  };

  // ===== MOVE WORLD =====
  distantBuildings.forEach(b => b.x -= currentSpeed * 0.2);
  foregroundBuildings.forEach(b => b.x -= currentSpeed);

  recycleBuildings(distantBuildings, "bg");
  recycleBuildings(foregroundBuildings, "fg");

  // ===== OBSTACLES =====
  obstacleTimer++;

  if (obstacleTimer > nextObstacleGap){
    const last = obstacles[obstacles.length - 1];
    const safeGap = granny.width + 25;

    if (!last || WIDTH - last.x > safeGap){

      obstacleTimer = 0;
      nextObstacleGap = 80 + Math.random() * 180;

      const choice = obstacleFiles[Math.floor(Math.random()*obstacleFiles.length)];

      obstacles.push({
        x: WIDTH,
        y: GROUND_Y - choice.height,
        width: choice.width,
        height: choice.height,
        name: choice.name
      });

      if (Math.random() < 0.25){
        nextObstacleGap *= 0.6;
      }
    }
  }

  obstacles.forEach(o => o.x -= currentSpeed);

  // ===== COLLISION =====
  for (let o of obstacles){
    if (checkCollision(grannyBox, o)){
      gameState = STATE.GAMEOVER;

      if (score > highScore){
        highScore = score;
        localStorage.setItem("grannyHighScore", highScore);
      }

      return;
    }
  }
}

// ===== DRAW =====
function draw(){
  if (gameState === STATE.TITLE){
    drawTitle();
    return;
  }

  ctx.fillStyle="#8dc2e3";
  ctx.fillRect(0,0,WIDTH,HEIGHT);

  drawGame();
  drawScore();

  if (gameState === STATE.GAMEOVER){
    drawGameOverOverlay();
  }
}

// ===== SCORE =====
function drawScore(){
  const s = String(score).padStart(3,"0");
  const hs = String(highScore).padStart(3,"0");

  ctx.textAlign = "right";

  drawBitmapText("HI " + hs, WIDTH - 10, 12);
  drawBitmapText(s, WIDTH - 10, 26);

  ctx.textAlign = "left";
}

// ===== GAME OVER =====
function drawGameOverOverlay(){

  const lines = ["GAME OVER", "PLAY AGAIN?"];
  const padding = 12;
  const lineHeight = bitmapFont.charHeight + 6;

  let maxWidth = 0;

  lines.forEach(line=>{
    const w = line.length * 9;
    maxWidth = Math.max(maxWidth, w);
  });

  const boxWidth = maxWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  const x = (WIDTH - boxWidth)/2;
  const y = (HEIGHT - boxHeight)/2;

  ctx.fillStyle = "black";
  ctx.fillRect(x,y,boxWidth,boxHeight);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  ctx.strokeRect(x,y,boxWidth,boxHeight);

  lines.forEach((line,i)=>{
    drawCenteredText(line, y + padding + i * lineHeight);
  });
}

// ===== TEXT =====
function drawCenteredText(text, y){
  const w = text.length * 9;
  drawBitmapText(text, (WIDTH - w)/2, y);
}

function drawBitmapText(text,x,y){
  text = text.toUpperCase();

  for (let i=0;i<text.length;i++){
    const idx = bitmapFont.chars.indexOf(text[i]);
    if (idx === -1) continue;

    ctx.drawImage(
      images.font,
      idx * 8, 0, 8, 10,
      x + i * 9, y,
      8, 10
    );
  }
}

// ===== TITLE =====
function drawTitle(){
  ctx.fillStyle="black";
  ctx.fillRect(0,0,WIDTH,HEIGHT);

  const img = images.title;
  if (img.complete){
    ctx.drawImage(img,(WIDTH-363)/2,(HEIGHT-222)/2-10);
  }

  if (showBlink)
    drawBitmapText("PRESS BUTTON TO START",20,250);
}

// ===== GAME =====
let lineOffset = 0;

function drawGame(){
  ctx.drawImage(cloudsLayer.image,0,20);

  distantBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));
  foregroundBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));

  ctx.fillStyle="#867e7c";
  ctx.fillRect(0, ROAD_TOP, WIDTH, STREET_HEIGHT + ROAD_EXTENSION);

  drawRoadLine();

  obstacles.forEach(o=>{
    ctx.drawImage(images[o.name], o.x, o.y, o.width, o.height);
  });

  const drawY = granny.feetY - granny.height;
  const sx = granny.frame * granny.width;

  ctx.drawImage(
    images.granny,
    sx,0,granny.width,granny.height,
    granny.x,drawY,granny.width,granny.height
  );
}

// ===== ROAD =====
function drawRoadLine(){
  const DASH = 48;
  const GAP = 108;
  const CYCLE = DASH + GAP;

  if (gameState === STATE.PLAYING){
    lineOffset -= currentSpeed;
  }

  ctx.fillStyle = "#fef752";

  for(let i=0;i<WIDTH/CYCLE+2;i++){
    ctx.fillRect(i*CYCLE + (lineOffset % CYCLE), HEIGHT-25, DASH, 3);
  }
}

// ===== UTIL =====
function checkCollision(a,b){
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function randomGap(){
  return 80 + Math.random()*220;
}

function recycleBuildings(list, prefix){
  if (!list.length) return;

  if (list[0].x + list[0].image.width < 0){
    list.shift();

    const img = images[prefix + (Math.floor(Math.random()*5)+1)];
    const last = list[list.length-1];

    list.push({
      image: img,
      x: last.x + last.image.width,
      y: prefix === "fg"
        ? ROAD_TOP - img.height
        : HEIGHT - STREET_HEIGHT - img.height - 40
    });
  }
}

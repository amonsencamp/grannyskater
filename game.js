// ====== AUDIO ======
const audio = {
  title: new Audio("assets/titleloop.wav"),
  game: new Audio("assets/song.wav"),
  jump: new Audio("assets/jump.wav"),
  land: new Audio("assets/land.wav"),
  hit: new Audio("assets/hit.wav"),
  select: new Audio("assets/select.wav")
};

// Loop setup
audio.title.loop = true;
audio.game.loop = true;

// Helper to play SFX cleanly
function playSound(sound){
  const s = sound.cloneNode(); // allows overlapping sounds
  s.play();
}

function stopMusic(){
  audio.title.pause();
  audio.title.currentTime = 0;

  audio.game.pause();
  audio.game.currentTime = 0;
}

// ====== game.js ======

// (everything unchanged until INPUT)

// ====== INPUT ======
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {

    if (spaceHeld) return;
    spaceHeld = true;

    // First user interaction → allow audio
    audio.title.play().catch(()=>{});

    if (gameState === STATE.TITLE){
      playSound(audio.select);
      stopMusic();
      audio.game.play();
      startGame();
      return;
    }

    if (gameState === STATE.GAMEOVER){
      playSound(audio.select);
      stopMusic();
      audio.game.play();
      resetGame();
      startGame();
      return;
    }

    if (gameState === STATE.PLAYING && granny.grounded && granny.state === "idle") {
      playSound(audio.jump);
      granny.state = "anticipation";
      granny.frameTimer = 0;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceHeld = false;
});

// ====== START ======
function startGame(){
  gameState = STATE.PLAYING;
}

// ====== RESET ======
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
}

// ====== UPDATE ======
function update(){

  blinkTimer++;
  if (blinkTimer > 25){
    blinkTimer = 0;
    showBlink = !showBlink;
  }

  if (gameState !== STATE.PLAYING) return;

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

    if (granny.vy < -6) granny.frame = 2;
    else if (granny.vy < -2) granny.frame = 3;
    else if (granny.vy < 0) granny.frame = 4;
    else granny.frame = 5;

    if (granny.feetY >= GROUND_Y){
      granny.feetY = GROUND_Y;
      granny.vy = 0;
      granny.state = "landing";
      granny.frame = 6;
      granny.frameTimer = 0;
      granny.grounded = true;

      playSound(audio.land); // ← LAND SOUND
    } else {
      granny.grounded = false;
    }
  }
  else if (granny.state === "landing"){
    if (granny.frameTimer > 4){
      granny.frame++;
      granny.frameTimer = 0;
      if (granny.frame > 8){
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

  distantBuildings.forEach(b => b.x -= speed * 0.2);
  foregroundBuildings.forEach(b => b.x -= speed);

  if (foregroundBuildings.length && foregroundBuildings[0].x + foregroundBuildings[0].image.width < 0){
    foregroundBuildings.shift();
    const img = images["fg"+(Math.floor(Math.random()*5)+1)];
    const last = foregroundBuildings[foregroundBuildings.length-1];
    foregroundBuildings.push({
      image: img,
      x: last.x + last.image.width,
      y: ROAD_TOP - img.height
    });
  }

  if (distantBuildings.length && distantBuildings[0].x + distantBuildings[0].image.width < 0){
    distantBuildings.shift();
    const img = images["bg"+(Math.floor(Math.random()*5)+1)];
    const last = distantBuildings[distantBuildings.length-1];
    distantBuildings.push({
      image: img,
      x: last.x + last.image.width,
      y: HEIGHT - STREET_HEIGHT - img.height - 40
    });
  }

  obstacleTimer++;
  if (obstacleTimer > nextObstacleGap){
    obstacleTimer = 0;
    nextObstacleGap = randomGap();

    const choice = obstacleFiles[Math.floor(Math.random()*obstacleFiles.length)];
    obstacles.push({
      x: WIDTH,
      y: GROUND_Y - choice.height,
      width: choice.width,
      height: choice.height,
      name: choice.name
    });
  }

  obstacles.forEach(o => o.x -= speed);

  for (let o of obstacles){
    if (checkCollision(grannyBox, o)){

      // HIT SOUND + STOP MUSIC
      stopMusic();
      playSound(audio.hit);

      gameState = STATE.GAMEOVER;
      return;
    }
  }
}

// ====== DRAW TITLE ======
function drawTitle(){
  ctx.fillStyle="black";
  ctx.fillRect(0,0,WIDTH,HEIGHT);

  // Ensure title music is playing
  if (audio.title.paused){
    audio.title.play().catch(()=>{});
  }

  const img = images.title;
  if (img.complete){
    ctx.drawImage(img,(WIDTH-363)/2,(HEIGHT-222)/2-10);
  }

  if (showBlink)
    drawBitmapText("PRESS BUTTON TO START",20,250);
}

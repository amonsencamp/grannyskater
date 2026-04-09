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

// Blink timer
let blinkTimer = 0;
let showBlink = true;

// Game speed
const speed = 3; // base speed for obstacles, road, foreground

// Images container
const images = {};

// Bitmap font
const bitmapFont = {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?.",
    charWidth: 8,
    charHeight: 10
};

// Granny
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

// Granny hitbox (shifted forward for skateboard)
const GRANNY_HITBOX = {
    x: 50,
    y: 40,
    width: 40,
    height: 95
};

// Obstacles
const obstacles = [];
const OBSTACLE_WIDTH = 25;  // cone width
const OBSTACLE_HEIGHT = 31; // cone height
const OBSTACLE_GAP = 220;
let obstacleTimer = 0;

// Road line
let lineOffset = 0;

// Input
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        if (gameState === STATE.TITLE){
            startGame();
            return;
        }
        if (gameState === STATE.PLAYING && granny.grounded && granny.state === "idle") {
            granny.state = "anticipation";
            granny.frameTimer = 0;
        }
    }
});

// ====== Preload images ======
const fgBuildingFiles = [
    "fg_building1.png",
    "fg_building2.png",
    "fg_building3.png",
    "fg_building4.png",
    "fg_building5.png"
];

const bgBuildingFiles = [
    "bg_building1.png",
    "bg_building2.png",
    "bg_building3.png",
    "bg_building4.png",
    "bg_building5.png"
];

const imagesToLoad = [
    { name: "title", src: "assets/titlescreen.png" },
    { name: "granny", src: "assets/granny_jump.png" },
    { name: "clouds", src: "assets/clouds.png" },
    { name: "font", src: "assets/font.png" },
    { name: "cone", src: "assets/cone.png" }
];

fgBuildingFiles.forEach((f,i)=>imagesToLoad.push({name:"fg"+(i+1),src:"assets/"+f}));
bgBuildingFiles.forEach((f,i)=>imagesToLoad.push({name:"bg"+(i+1),src:"assets/"+f}));

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

// ====== Background layers ======
let cloudsLayer = { image:null, x:0, y:20 };
let distantBuildings = [];
let foregroundBuildings = [];

function initLayers(){
    cloudsLayer.image = images.clouds;

    // distant buildings
    let xPos = 0;
    while(xPos < WIDTH + 200){
        const idx = Math.floor(Math.random()*bgBuildingFiles.length)+1;
        const img = images["bg"+idx];
        distantBuildings.push({
            image: img,
            x: xPos,
            y: HEIGHT - STREET_HEIGHT - img.height - 40
        });
        xPos += img.width;
    }

    // foreground buildings
    xPos = 0;
    while(xPos < WIDTH + 200){
        const idx = Math.floor(Math.random()*fgBuildingFiles.length)+1;
        const img = images["fg"+idx];
        foregroundBuildings.push({
            image: img,
            x: xPos,
            y: ROAD_TOP - img.height
        });
        xPos += img.width;
    }
}

// Collision check
function checkCollision(a, b){
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// ====== Start game ======
function startGame(){
    gameState = STATE.PLAYING;
}

// ====== Main loop ======
function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}

// ====== Update ======
function update(){

    blinkTimer++;
    if (blinkTimer > 25){
        blinkTimer = 0;
        showBlink = !showBlink;
    }

    if (gameState !== STATE.PLAYING) return;

    granny.frameTimer++;

    // Jump logic
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

    // ====== Update moving elements ======

    // Distant buildings (slow parallax)
    distantBuildings.forEach(b => b.x -= speed * 0.2);
    if (distantBuildings[0].x + distantBuildings[0].image.width < 0){
        distantBuildings.shift();
        const idx = Math.floor(Math.random()*bgBuildingFiles.length)+1;
        const img = images["bg"+idx];
        const last = distantBuildings[distantBuildings.length-1];
        distantBuildings.push({
            image: img,
            x: last.x + last.image.width,
            y: HEIGHT - STREET_HEIGHT - img.height - 40
        });
    }

    // Foreground buildings (match road/obstacles speed)
    foregroundBuildings.forEach(b => b.x -= speed);
    if (foregroundBuildings[0].x + foregroundBuildings[0].image.width < 0){
        foregroundBuildings.shift();
        const idx = Math.floor(Math.random()*fgBuildingFiles.length)+1;
        const img = images["fg"+idx];
        const last = foregroundBuildings[foregroundBuildings.length-1];
        foregroundBuildings.push({
            image: img,
            x: last.x + last.image.width,
            y: ROAD_TOP - img.height
        });
    }

    // Obstacles
    obstacleTimer++;
    if (obstacleTimer > OBSTACLE_GAP){
        obstacleTimer = 0;
        obstacles.push({
            x: WIDTH,
            y: GROUND_Y - OBSTACLE_HEIGHT,
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT
        });
    }
    obstacles.forEach(o => o.x -= speed);
    while (obstacles.length && obstacles[0].x + obstacles[0].width < 0){
        obstacles.shift();
    }

    // Road line (move here to sync with obstacles/foreground)
    lineOffset -= speed;

    // Collision check
    for (let o of obstacles){
        if (checkCollision(grannyBox, o)){
            gameState = STATE.GAMEOVER;
            break;
        }
    }
}

// ====== Draw ======
function draw(){
    ctx.fillStyle="#8dc2e3";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    if (gameState===STATE.TITLE) drawTitle();
    else if (gameState===STATE.PLAYING || gameState===STATE.GAMEOVER) drawGame();

    if (gameState === STATE.GAMEOVER){
        drawBitmapText("GAME OVER",130,120);
    }
}

// ====== Bitmap font ======
function drawBitmapText(text,x,y){
    text = text.toUpperCase();
    if (!images.font.complete) return;

    const spacing = 1;
    for (let i=0;i<text.length;i++){
        const ch = text[i];
        const index = bitmapFont.chars.indexOf(ch);
        if (index===-1) continue;
        const sx = index * bitmapFont.charWidth;
        ctx.drawImage(
            images.font,
            sx,0,
            bitmapFont.charWidth, bitmapFont.charHeight,
            x+i*(bitmapFont.charWidth+spacing), y,
            bitmapFont.charWidth, bitmapFont.charHeight
        );
    }
}

// ====== Title ======
function drawTitle(){
    ctx.fillStyle="black";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    const img = images.title;
    if (img.complete){
        const x = Math.floor((WIDTH-363)/2);
        const y = Math.floor((HEIGHT-222)/2-10);
        ctx.drawImage(img,x,y);
    }

    if (showBlink)
        drawBitmapText("PRESS BUTTON TO START",20,250);
}

// ====== Game ======
function drawGame(){
    ctx.drawImage(cloudsLayer.image,cloudsLayer.x,cloudsLayer.y);

    distantBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));
    foregroundBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));

    // road
    ctx.fillStyle="#867e7c";
    ctx.fillRect(0, ROAD_TOP, WIDTH, STREET_HEIGHT + ROAD_EXTENSION);
    drawRoadLine();

    // obstacles (cones)
    obstacles.forEach(o=>{
        ctx.drawImage(images.cone, o.x, o.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
    });

    // granny
    const drawY = granny.feetY - granny.height;
    const sx = granny.frame * granny.width;
    ctx.drawImage(images.granny, sx, 0, granny.width, granny.height, granny.x, drawY, granny.width, granny.height);
}

// ====== Draw road line ======
function drawRoadLine(){
    const DASH = 24;
    const GAP = 36;
    const CYCLE = DASH + GAP;

    ctx.fillStyle = "#fef752";

    for(let i = -1; i < WIDTH / CYCLE + 2; i++){
        const x = i * CYCLE + (lineOffset % CYCLE);
        ctx.fillRect(
            x,
            HEIGHT - 25,
            DASH,
            3
        );
    }
}

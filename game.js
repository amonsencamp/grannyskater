// ====== game.js ======

// Canvas setup
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Disable smoothing for pixel art
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

// Canvas size
const WIDTH = 400;
const HEIGHT = 300;
const STREET_HEIGHT = 30;

// Game states
const STATE = { TITLE: 0, PLAYING: 1, GAMEOVER: 2 };
let gameState = STATE.TITLE;

// Blink timer for title screen
let lastTime = 0;
let blinkTimer = 0;
let showBlink = true;

// Game speed
let speed = 2;

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
    y: HEIGHT - STREET_HEIGHT - 150,

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

// Input
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {

        if (gameState === STATE.TITLE) {
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
const fgBuildingFiles = ["fg_building1.png","fg_building2.png","fg_building3.png","fg_building4.png","fg_building5.png"];
const bgBuildingFiles = ["bg_building1.png","bg_building2.png","bg_building3.png","bg_building4.png","bg_building5.png"];

const imagesToLoad = [
    { name: "title", src: "assets/titlescreen.png" },
    { name: "granny", src: "assets/granny.png" },
    { name: "clouds", src: "assets/clouds.png" },
    { name: "font", src: "assets/font.png" }
];

fgBuildingFiles.forEach((f, i) => imagesToLoad.push({ name: "fg" + (i+1), src: "assets/" + f }));
bgBuildingFiles.forEach((f, i) => imagesToLoad.push({ name: "bg" + (i+1), src: "assets/" + f }));

// Preload
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

// ====== Background layers ======
let cloudsLayer = { image: null, x: 0, y: 20, speedMult: 0 };
let distantBuildings = [];
let foregroundBuildings = [];

function initLayers() {

    cloudsLayer.image = images.clouds;

    let xPos = 0;
    while (xPos < WIDTH + 200) {
        const index = Math.floor(Math.random() * bgBuildingFiles.length) + 1;
        const img = images["bg" + index];
        distantBuildings.push({
            image: img,
            x: xPos,
            y: HEIGHT - STREET_HEIGHT - img.height - 40
        });
        xPos += img.width;
    }

    xPos = 0;
    while (xPos < WIDTH + 200) {
        const index = Math.floor(Math.random() * fgBuildingFiles.length) + 1;
        const img = images["fg" + index];
        foregroundBuildings.push({
            image: img,
            x: xPos,
            y: HEIGHT - STREET_HEIGHT - img.height
        });
        xPos += img.width;
    }
}

// ====== Start game ======
function startGame() {
    gameState = STATE.PLAYING;
}

// ====== Main loop ======
function loop(timestamp) {

    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    draw();

    requestAnimationFrame(loop);
}

// ====== Update ======
function update(delta) {

    blinkTimer += delta;
    if (blinkTimer > 400) {
        blinkTimer = 0;
        showBlink = !showBlink;
    }

    if (gameState === STATE.PLAYING) {

        // gravity
        granny.vy += granny.gravity;
        granny.y += granny.vy;

        const groundY = HEIGHT - STREET_HEIGHT - granny.height;

        if (granny.y >= groundY) {
            granny.y = groundY;
            granny.vy = 0;
            granny.grounded = true;
        } else {
            granny.grounded = false;
        }

     // animation
granny.frameTimer += delta;

// anticipation
if (granny.state === "anticipation") {
    granny.frame = 1;

    if (granny.frameTimer > 80) {
        granny.vy = granny.jumpPower;
        granny.state = "jump";
    }
}

// jump animation based on velocity
else {

    if (granny.grounded) {
        granny.frame = 0;
        granny.state = "idle";
    }

    else if (granny.vy < -6) granny.frame = 2;
    else if (granny.vy < -2) granny.frame = 3;
    else if (granny.vy < 0)  granny.frame = 4;
    else if (granny.vy < 2)  granny.frame = 5;
    else if (granny.vy < 6)  granny.frame = 6;
    else if (granny.vy < 10) granny.frame = 7;
    else                     granny.frame = 8;
}

        // Clouds
        cloudsLayer.x -= speed * 0.05;
        if (cloudsLayer.x <= -cloudsLayer.image.width)
            cloudsLayer.x += cloudsLayer.image.width;

        // distant buildings
        distantBuildings.forEach(b => b.x -= speed * 0.2);
        if (distantBuildings[0].x + distantBuildings[0].image.width < 0) {
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

        // foreground buildings
        foregroundBuildings.forEach(b => b.x -= speed * 0.8);
        if (foregroundBuildings[0].x + foregroundBuildings[0].image.width < 0) {
            foregroundBuildings.shift();
            const idx = Math.floor(Math.random()*fgBuildingFiles.length)+1;
            const img = images["fg"+idx];
            const last = foregroundBuildings[foregroundBuildings.length-1];
            foregroundBuildings.push({
                image: img,
                x: last.x + last.image.width,
                y: HEIGHT - STREET_HEIGHT - img.height
            });
        }
    }
}

// ====== Draw ======
function draw() {

    ctx.fillStyle = "#8dc2e3";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    if (gameState === STATE.TITLE) drawTitle();
    if (gameState === STATE.PLAYING) drawGame();
}

// ====== Bitmap font ======
function drawBitmapText(text, x, y) {

    text = text.toUpperCase();
    if (!images.font.complete) return;

    const spacing = 1;

    for (let i=0;i<text.length;i++){

        const ch = text[i];
        const index = bitmapFont.chars.indexOf(ch);
        if (index === -1) continue;

        const sx = index * bitmapFont.charWidth;

        ctx.drawImage(
            images.font,
            sx,0,
            bitmapFont.charWidth,
            bitmapFont.charHeight,
            x + i*(bitmapFont.charWidth+spacing),
            y,
            bitmapFont.charWidth,
            bitmapFont.charHeight
        );
    }
}

// ====== Title ======
function drawTitle() {

    ctx.fillStyle="black";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    const img = images.title;

    if (img.complete) {
        const x = Math.floor((WIDTH-363)/2);
        const y = Math.floor((HEIGHT-222)/2-10);
        ctx.drawImage(img,x,y);
    }

    if (showBlink)
        drawBitmapText("PRESS BUTTON TO START",20,250);
}

// ====== Game ======
let lineOffset = 0;

function drawGame() {

    ctx.drawImage(cloudsLayer.image,cloudsLayer.x,cloudsLayer.y);
    ctx.drawImage(cloudsLayer.image,cloudsLayer.x+cloudsLayer.image.width,cloudsLayer.y);

    distantBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));
    foregroundBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));

    ctx.fillStyle="#867e7c";
    ctx.fillRect(0,HEIGHT-STREET_HEIGHT,WIDTH,STREET_HEIGHT);

    drawRoadLine();

    const sx = granny.frame * granny.width;

    ctx.drawImage(
        images.granny,
        sx,0,
        granny.width,
        granny.height,
        granny.x,
        granny.y,
        granny.width,
        granny.height
    );
}

// ====== Road line ======
function drawRoadLine(){

    lineOffset -= speed;
    if (lineOffset < -24) lineOffset = 0;

    ctx.fillStyle="#fef752";

    for(let i=0;i<WIDTH/24+2;i++){
        ctx.fillRect(
            i*24+lineOffset,
            HEIGHT-15,
            12,
            3
        );
    }
}

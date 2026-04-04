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
    y: HEIGHT - 30 - 150,
    width: 114,
    height: 150
};

// Input
let buttonPressed = false;
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        buttonPressed = true;
        if (gameState === STATE.TITLE) startGame();
    }
});
window.addEventListener("keyup", (e) => {
    if (e.code === "Space") buttonPressed = false;
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

// Add foreground and background buildings
fgBuildingFiles.forEach((f, i) => imagesToLoad.push({ name: "fg" + (i+1), src: "assets/" + f }));
bgBuildingFiles.forEach((f, i) => imagesToLoad.push({ name: "bg" + (i+1), src: "assets/" + f }));

// Preload all images
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
let cloudsLayer = { image: null, x: 0, y: 20, speedMult: 0.05 };
let distantBuildings = [];
let foregroundBuildings = [];

function initLayers() {
    cloudsLayer.image = images.clouds;

    // Distant buildings (bg layer)
    let xPos = 0;
    while (xPos < WIDTH + 200) {
        const index = Math.floor(Math.random() * bgBuildingFiles.length) + 1;
        const img = images["bg" + index];
        distantBuildings.push({ image: img, x: xPos, y: HEIGHT - 50 - img.height - 40 });
        xPos += img.width;
    }

    // Foreground buildings (fg layer)
    xPos = 0;
    while (xPos < WIDTH + 200) {
        const index = Math.floor(Math.random() * fgBuildingFiles.length) + 1;
        const img = images["fg" + index];
        foregroundBuildings.push({ image: img, x: xPos, y: HEIGHT - 50 - img.height });
        xPos += img.width;
    }
}

// ====== Start game ======
function startGame() { gameState = STATE.PLAYING; }

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
    if (blinkTimer > 400) { blinkTimer = 0; showBlink = !showBlink; }

    if (gameState === STATE.PLAYING) {
        // Clouds
        cloudsLayer.x -= speed * cloudsLayer.speedMult;
        if (cloudsLayer.x <= -cloudsLayer.image.width) cloudsLayer.x += cloudsLayer.image.width;

        // Distant buildings
        distantBuildings.forEach(bld => bld.x -= speed * 0.3);
        let firstDist = distantBuildings[0];
        if (firstDist.x + firstDist.image.width < 0) {
            distantBuildings.shift();
            const idx = Math.floor(Math.random() * bgBuildingFiles.length) + 1;
            const img = images["bg" + idx];
            const lastBld = distantBuildings[distantBuildings.length - 1];
            distantBuildings.push({ image: img, x: lastBld.x + lastBld.image.width, y: HEIGHT - 50 - img.height - 40 });
        }

        // Foreground buildings
        foregroundBuildings.forEach(bld => bld.x -= speed * 0.5);
        let firstFore = foregroundBuildings[0];
        if (firstFore.x + firstFore.image.width < 0) {
            foregroundBuildings.shift();
            const idx = Math.floor(Math.random() * fgBuildingFiles.length) + 1;
            const img = images["fg" + idx];
            const lastBld = foregroundBuildings[foregroundBuildings.length - 1];
            foregroundBuildings.push({ image: img, x: lastBld.x + lastBld.image.width, y: HEIGHT - 50 - img.height });
        }
    }
}

// ====== Draw ======
function draw() {
    // Sky
    ctx.fillStyle = "#8dc2e3";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (gameState === STATE.TITLE) drawTitle();
    if (gameState === STATE.PLAYING) drawGame();
}

// ====== Bitmap font ======
function drawBitmapText(text, x, y) {
    text = text.toUpperCase();
    if (!images.font.complete) return;

    const spacing = 1;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const index = bitmapFont.chars.indexOf(ch);
        if (index === -1) continue;

        const sx = index * bitmapFont.charWidth;
        const sy = 0;
        const sw = bitmapFont.charWidth;
        const sh = bitmapFont.charHeight;

        ctx.drawImage(images.font, sx, sy, sw, sh, x + i*(sw + spacing), y, sw, sh);
    }
}

// ====== Title screen ======
function drawTitle() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const img = images.title;
    if (img.complete) {
        const x = Math.floor((WIDTH - 363)/2);
        const y = Math.floor((HEIGHT - 222)/2 - 10);
        ctx.drawImage(img, x, y);
    }

    if (showBlink && images.font.complete) {
        drawBitmapText("PRESS BUTTON TO START", 20, 250);
    }
}

// ====== Game ======
let lineOffset = 0;
function drawGame() {
    // Clouds
    ctx.drawImage(cloudsLayer.image, cloudsLayer.x, cloudsLayer.y);
    ctx.drawImage(cloudsLayer.image, cloudsLayer.x + cloudsLayer.image.width, cloudsLayer.y);

    // Distant buildings
    distantBuildings.forEach(bld => ctx.drawImage(bld.image, bld.x, bld.y));

    // Foreground buildings
    foregroundBuildings.forEach(bld => ctx.drawImage(bld.image, bld.x, bld.y));

    // Street
    ctx.fillStyle = "#867e7c";
    ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);

    // Dashed line
    drawRoadLine();

    // Granny
    ctx.drawImage(images.granny, granny.x, granny.y);
}

// ====== Dashed line ======
function drawRoadLine() {
    lineOffset -= speed;
    if (lineOffset < -24) lineOffset = 0;

    ctx.fillStyle = "#fef752";
    for (let i = 0; i < WIDTH / 24 + 2; i++) {
        ctx.fillRect(i*24 + lineOffset, HEIGHT - 25, 12, 3);
    }
}

// ====== game.js ======

// Canvas setup
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Disable smoothing for crisp pixels
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

// Canvas dimensions
const WIDTH = 400;
const HEIGHT = 300;

// Game states
const STATE = {
    TITLE: 0,
    PLAYING: 1,
    GAMEOVER: 2
};
let gameState = STATE.TITLE;

// Timing for blinking text
let lastTime = 0;
let blinkTimer = 0;
let showBlink = true;

// Game speed
let speed = 2;

// Images container
const images = {};

// Bitmap font settings (no direct reference to images yet)
const bitmapFont = {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?.",
    charWidth: 8,  // adjust to match your font.png
    charHeight: 10
};

// Granny setup
const granny = {
    x: 30,
    y: HEIGHT - 30 - 150,
    width: 114,
    height: 150
};

// Input handling
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

// Preload all images
const imagesToLoad = [
    { name: "title", src: "assets/titlescreen.png" },
    { name: "granny", src: "assets/granny.png" },
    { name: "bg1", src: "assets/bglayer1.png" },
    { name: "bg2", src: "assets/bglayer2.png" },
    { name: "clouds", src: "assets/clouds.png" },
    { name: "font", src: "assets/font.png" }
];

let loadedCount = 0;
imagesToLoad.forEach(imgData => {
    const img = new Image();
    img.src = imgData.src;
    img.onload = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
            requestAnimationFrame(loop); // start loop only when all images are loaded
        }
    };
    images[imgData.name] = img;
});

// Start the game
function startGame() {
    gameState = STATE.PLAYING;
}

// Main game loop
function loop(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    draw();

    requestAnimationFrame(loop);
}

// Update function
function update(delta) {
    // Blink timer for title text
    blinkTimer += delta;
    if (blinkTimer > 400) {
        blinkTimer = 0;
        showBlink = !showBlink;
    }

    if (gameState === STATE.PLAYING) {
        // TODO: implement gameplay updates
    }
}

// Draw function
function draw() {
    // Sky background
    ctx.fillStyle = "#8dc2e3";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw depending on game state
    if (gameState === STATE.TITLE) drawTitle();
    if (gameState === STATE.PLAYING) drawGame();
}

// Draw bitmap font text
function drawBitmapText(text, x, y) {
    text = text.toUpperCase();

    if (!images.font || !images.font.complete) return;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const index = bitmapFont.chars.indexOf(ch);
        if (index === -1) continue;

        const sx = index * bitmapFont.charWidth;
        const sy = 0;
        const sw = bitmapFont.charWidth;
        const sh = bitmapFont.charHeight;

        ctx.drawImage(
            images.font,
            sx, sy, sw, sh,
            x + i * bitmapFont.charWidth,
            y,
            sw, sh
        );
    }
}

// Draw the title screen
function drawTitle() {
    // Black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw title image
    const img = images.title;
    if (img.complete) {
        const x = Math.floor((WIDTH - 363) / 2);
        const y = Math.floor((HEIGHT - 222) / 2 - 10);
        ctx.drawImage(img, x, y);
    }

    // Blinking "PRESS BUTTON TO START" text
    if (showBlink && images.font.complete) {
        drawBitmapText("PRESS BUTTON TO START", 20, 250); // left-aligned
    }
}

// Draw game placeholder
let lineOffset = 0;
function drawGame() {
    // TODO: implement scrolling clouds, parallax layers, obstacles

    // Street
    ctx.fillStyle = "#867e7c";
    ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);

    // Dashed line
    drawRoadLine();

    // Granny sprite
    ctx.drawImage(images.granny, granny.x, granny.y);
}

// Draw dashed yellow line for street
function drawRoadLine() {
    lineOffset -= speed;
    if (lineOffset < -24) lineOffset = 0;

    ctx.fillStyle = "#fef752";
    for (let i = 0; i < WIDTH / 24 + 2; i++) {
        ctx.fillRect(
            i * 24 + lineOffset,
            HEIGHT - 25,
            12,
            3
        );
    }
}

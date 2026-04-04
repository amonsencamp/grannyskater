const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

const WIDTH = 400;
const HEIGHT = 300;

const STATE = {
    TITLE: 0,
    PLAYING: 1,
    GAMEOVER: 2
};

let gameState = STATE.TITLE;

let lastTime = 0;
let blinkTimer = 0;
let showBlink = true;

// speed (will increase later)
let speed = 2;

// Load images
const images = {};

function loadImage(name, src) {
    const img = new Image();
    img.src = src;
    images[name] = img;
}

loadImage("title", "assets/titlescreen.png");
loadImage("granny", "assets/granny.png");
loadImage("bg1", "assets/bglayer1.png");
loadImage("bg2", "assets/bglayer2.png");
loadImage("clouds", "assets/clouds.png");

// Granny
const granny = {
    x: 30,
    y: HEIGHT - 30 - 150, // 30px from bottom
    width: 114,
    height: 150
};

// Input
let buttonPressed = false;

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        buttonPressed = true;

        if (gameState === STATE.TITLE) {
            startGame();
        }
    }
});

window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
        buttonPressed = false;
    }
});

// Start game
function startGame() {
    gameState = STATE.PLAYING;
}

// Main loop
function loop(timestamp) {

    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    draw();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Update
function update(delta) {

    // blink text
    blinkTimer += delta;

    if (blinkTimer > 500) {
        blinkTimer = 0;
        showBlink = !showBlink;
    }

    if (gameState === STATE.PLAYING) {
        // gameplay update coming next
    }
}

// Draw
function draw() {

    // sky
    ctx.fillStyle = "#8dc2e3";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (gameState === STATE.TITLE) {
        drawTitle();
    }

    if (gameState === STATE.PLAYING) {
        drawGame();
    }
}

// Title screen
function drawTitle() {

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // title image centered
    const img = images.title;
    const x = (WIDTH - 363) / 2;
    const y = (HEIGHT - 222) / 2 - 10;

    ctx.drawImage(img, x, y);

    // blinking text
    if (showBlink) {
        ctx.fillStyle = "white";
        ctx.font = "16px monospace";
        ctx.fillText(
            "PRESS BUTTON TO START",
            150,
            250
        );
    }
}

// Game
function drawGame() {

    // sky already drawn

    // clouds (placeholder for now)
    // bg2
    // bg1

    // street
    ctx.fillStyle = "#867e7c";
    ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);

    // dashed line
    drawRoadLine();

    // granny
    ctx.drawImage(
        images.granny,
        granny.x,
        granny.y
    );
}

// dashed yellow line
let lineOffset = 0;

function drawRoadLine() {

    lineOffset -= speed;

    if (lineOffset < -24) {
        lineOffset = 0;
    }

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

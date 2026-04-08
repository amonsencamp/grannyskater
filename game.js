// ====== Canvas ======

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const WIDTH = 400;
const HEIGHT = 300;

const STREET_HEIGHT = 30;

// ====== Game State ======

const STATE = { TITLE:0, PLAYING:1 };
let gameState = STATE.TITLE;

let lastTime = 0;
let speed = 2;

// ====== Images ======

const images = {};

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
{name:"title",src:"assets/titlescreen.png"},
{name:"granny",src:"assets/granny_jump.png"},
{name:"clouds",src:"assets/clouds.png"},
{name:"font",src:"assets/font.png"}
];

fgBuildingFiles.forEach((f,i)=>imagesToLoad.push({name:"fg"+i,src:"assets/"+f}));
bgBuildingFiles.forEach((f,i)=>imagesToLoad.push({name:"bg"+i,src:"assets/"+f}));

let loaded=0;
imagesToLoad.forEach(d=>{
const img=new Image();
img.src=d.src;
img.onload=()=>{
loaded++;
if(loaded===imagesToLoad.length){
initLayers();
requestAnimationFrame(loop);
}
};
images[d.name]=img;
});

// ====== Granny ======

const granny = {

x:30,
width:106,
height:150,

y: HEIGHT - STREET_HEIGHT - 150,

vy:0,
gravity:.65,
jumpPower:-13,
grounded:true,

frame:0,
frameTimer:0,
state:"idle"

};

// ====== Input ======

window.addEventListener("keydown",e=>{

if(e.code==="Space"){

if(gameState===STATE.TITLE){
gameState=STATE.PLAYING;
return;
}

if(granny.grounded && granny.state==="idle"){
granny.state="anticipation";
granny.frame=1;
granny.frameTimer=0;
}

}

});

// ====== Layers ======

let cloudsLayer={image:null,x:0,y:20,speedMult:.05};

let distantBuildings=[];
let foregroundBuildings=[];

function initLayers(){

cloudsLayer.image=images.clouds;

let x=0;
while(x<WIDTH+200){
const i=Math.floor(Math.random()*bgBuildingFiles.length);
const img=images["bg"+i];
distantBuildings.push({
image:img,
x:x,
y:HEIGHT-STREET_HEIGHT-img.height-40
});
x+=img.width;
}

x=0;
while(x<WIDTH+200){
const i=Math.floor(Math.random()*fgBuildingFiles.length);
const img=images["fg"+i];
foregroundBuildings.push({
image:img,
x:x,
y:HEIGHT-STREET_HEIGHT-img.height
});
x+=img.width;
}

}

// ====== Loop ======

function loop(t){

const delta=t-lastTime;
lastTime=t;

update(delta);
draw();

requestAnimationFrame(loop);

}

// ====== Update ======

function update(delta){

if(gameState!==STATE.PLAYING) return;

// physics
granny.vy+=granny.gravity;
granny.y+=granny.vy;

const ground=HEIGHT-STREET_HEIGHT-granny.height;

if(granny.y>=ground){
granny.y=ground;
granny.vy=0;
granny.grounded=true;
}else{
granny.grounded=false;
}

// animation
granny.frameTimer+=delta;

switch(granny.state){

case "idle":
granny.frame=0;
break;

case "anticipation":

granny.frame=1;

if(granny.frameTimer>80){
granny.vy=granny.jumpPower;
granny.state="rising";
granny.frameTimer=0;
}

break;

case "rising":

if(granny.vy<-6) granny.frame=2;
else if(granny.vy<-2) granny.frame=3;
else granny.frame=4;

if(granny.vy>=0) granny.state="peak";

break;

case "peak":

granny.frame=5;

if(granny.vy>2) granny.state="falling";

break;

case "falling":

if(granny.vy<6) granny.frame=6;
else if(granny.vy<10) granny.frame=7;
else granny.frame=8;

if(granny.grounded){
granny.state="landing";
granny.frame=6;
granny.frameTimer=0;
}

break;

case "landing":

if(granny.frameTimer>60) granny.frame=7;
if(granny.frameTimer>120) granny.frame=8;

if(granny.frameTimer>180){
granny.state="idle";
granny.frame=0;
}

break;

}

// clouds
cloudsLayer.x-=speed*cloudsLayer.speedMult;
if(cloudsLayer.x<=-cloudsLayer.image.width)
cloudsLayer.x+=cloudsLayer.image.width;

// distant buildings
distantBuildings.forEach(b=>b.x-=speed*.3);

if(distantBuildings[0].x + distantBuildings[0].image.width < 0){

distantBuildings.shift();

const i=Math.floor(Math.random()*bgBuildingFiles.length);
const img=images["bg"+i];
const last=distantBuildings[distantBuildings.length-1];

distantBuildings.push({
image:img,
x:last.x+last.image.width,
y:HEIGHT-STREET_HEIGHT-img.height-40
});

}

// foreground buildings
foregroundBuildings.forEach(b=>b.x-=speed*.5);

if(foregroundBuildings[0].x + foregroundBuildings[0].image.width < 0){

foregroundBuildings.shift();

const i=Math.floor(Math.random()*fgBuildingFiles.length);
const img=images["fg"+i];
const last=foregroundBuildings[foregroundBuildings.length-1];

foregroundBuildings.push({
image:img,
x:last.x+last.image.width,
y:HEIGHT-STREET_HEIGHT-img.height
});

}

}

// ====== Draw ======

function draw(){

ctx.fillStyle="#8dc2e3";
ctx.fillRect(0,0,WIDTH,HEIGHT);

drawGame();

}

function drawGame(){

// clouds
ctx.drawImage(cloudsLayer.image,cloudsLayer.x,cloudsLayer.y);
ctx.drawImage(cloudsLayer.image,cloudsLayer.x+cloudsLayer.image.width,cloudsLayer.y);

// bg buildings
distantBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));

// fg buildings
foregroundBuildings.forEach(b=>ctx.drawImage(b.image,b.x,b.y));

// street
ctx.fillStyle="#867e7c";
ctx.fillRect(0,HEIGHT-STREET_HEIGHT,WIDTH,STREET_HEIGHT);

// line
drawRoadLine();

// granny sprite
const sx = granny.frame * granny.width;

ctx.drawImage(
images.granny,
sx,
0,
granny.width,
granny.height,
granny.x,
granny.y,
granny.width,
granny.height
);

}

// ====== Road line ======

let lineOffset=0;

function drawRoadLine(){

lineOffset-=speed;
if(lineOffset<-24) lineOffset=0;

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

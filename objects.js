// --- objects.js ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 界面元素
const modal = document.getElementById('gameOverModal');
const victoryModal = document.getElementById('victoryModal');
const startScreen = document.getElementById('startScreen');
const finalScoreSpan = document.getElementById('finalScore');
const victoryScoreSpan = document.getElementById('victoryScore');

const restartBtn = document.getElementById('restartBtn');
const startBtn = document.getElementById('startBtn');
const victoryBtn = document.getElementById('victoryBtn');

const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// 【修改】音频对象 (按照你的要求更新)
const shootSound = new Audio('./laserShoot.wav');
const explosionSound = new Audio('./explosion.wav');
const moveSound = new Audio('./hitHurt.wav');
// 注意：hitHurt.wav 通常是单次音效，不适合 loop，所以我把 loop 关掉了，或者你可以换个引擎声
moveSound.loop = false;
moveSound.volume = 0.4;

// 游戏状态
let score = 0;
let keys = {};
let isGameRunning = false;
let screenShake = 0;
let timeStop = false;

// 任务系统变量
const TARGET_KILLS = 20;
let tanksDestroyed = 0;

// 玩家
const player = {
  x: 400, y: 500, radius: 15,
  speed: 2.5,
  color: '#00FF00',
  dx: 0, dy: -1,
  lastShotTime: 0, shootDelay: 250,
  weaponLevel: 1,
  hasShield: false, shieldTime: 0
};

// 数组
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerups = [];

// 地图
const steelWalls = [
  { x: 100, y: 150, w: 100, h: 30 },
  { x: 600, y: 150, w: 100, h: 30 },
  { x: 385, y: 300, w: 30, h: 100 }
];
let brickWalls = [];
function initBrickWalls() {
  brickWalls = [];
  for (let i = 0; i < 10; i++) { brickWalls.push({ x: 200 + i * 40, y: 400, w: 40, h: 20, hp: 1 }); }
  for (let i = 0; i < 5; i++) { brickWalls.push({ x: 100, y: 250 + i * 30, w: 30, h: 30, hp: 1 }); }
  for (let i = 0; i < 5; i++) { brickWalls.push({ x: 670, y: 250 + i * 30, w: 30, h: 30, hp: 1 }); }
}

function circleRectCollision(circle, rect) {
  let closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  let closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  let distanceX = circle.x - closestX;
  let distanceY = circle.y - closestY;
  return (distanceX * distanceX) + (distanceY * distanceY) < (circle.radius * circle.radius);
}
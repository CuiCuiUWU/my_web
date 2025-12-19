// --- objects.js ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 弹窗相关元素
const modal = document.getElementById('gameOverModal');
const finalScoreSpan = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// 全局游戏状态
let score = 0;
let keys = {};
let isGameRunning = true; // 【新增】控制游戏是否正在进行

// 【新增】敌人数量上限 (防止卡顿)
const MAX_ENEMIES = 10;

// 玩家对象
const player = {
  x: 400,
  y: 500,
  radius: 15,
  speed: 4,
  color: '#00FF00',
  dx: 0,
  dy: -1,
  lastShotTime: 0,
  shootDelay: 250
};

// 游戏物体
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];

// 地图墙壁
const walls = [
  { x: 100, y: 100, w: 200, h: 30 },
  { x: 500, y: 100, w: 200, h: 30 },
  { x: 300, y: 300, w: 30, h: 200 },
  { x: 150, y: 400, w: 100, h: 30 },
  { x: 550, y: 400, w: 100, h: 30 }
];

// 碰撞检测
function circleRectCollision(circle, rect) {
  let closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  let closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  let distanceX = circle.x - closestX;
  let distanceY = circle.y - closestY;
  return (distanceX * distanceX) + (distanceY * distanceY) < (circle.radius * circle.radius);
}

// 【新增】音效对象
// 注意：如果你的文件名不一样，这里要改成对应的名字
const shootSound = new Audio('/创意作品/音效文件/click.wav');
const explosionSound = new Audio('/创意作品/音效文件/explosion.wav');
const moveSound = new Audio('/创意作品/音效文件/hitHurt.wav');

// 设置移动音效循环播放
moveSound.loop = true;
// 适当降低引擎音量，不然太吵
moveSound.volume = 0.5;
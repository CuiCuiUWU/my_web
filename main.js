// --- main.js (修复速度叠加Bug + 完整功能) ---

// 1. 监听
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
victoryBtn.addEventListener('click', restartGame);
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// 【修复变量】用来存储循环的身份证号，方便取消它
let animationId;

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => { });
}

function addShake(amount) { screenShake = amount; }

function createExplosion(x, y, color) {
  playSound(explosionSound);
  addShake(5);
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x, y: y, radius: Math.random() * 3 + 1, color: color,
      vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0
    });
  }
}

// 2. 界面控制
function updateProgressUI() {
  const percent = (tanksDestroyed / TARGET_KILLS) * 100;
  progressBar.style.width = percent + '%';
  progressText.innerText = `任务目标: ${tanksDestroyed} / ${TARGET_KILLS}`;
}

function startGame() {
  startScreen.style.display = 'none';
  shootSound.play().then(() => { shootSound.pause(); }).catch(() => { });
  restartGame();
}

function restartGame() {
  // 【关键修复】如果之前有正在运行的循环，先取消掉！
  // 这样保证永远只有一个循环在跑
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  modal.style.display = 'none';
  victoryModal.style.display = 'none';

  score = 0; scoreElement.innerText = 0;
  tanksDestroyed = 0;
  updateProgressUI();

  player.x = 400; player.y = 500;
  player.weaponLevel = 1;
  player.hasShield = false;

  enemies = [];
  enemyBullets = [];
  playerBullets = [];
  particles = [];
  powerups = [];
  initBrickWalls();

  isGameRunning = true;
  keys = {};

  // 启动新循环
  gameLoop();
}

function gameOver() {
  isGameRunning = false;
  finalScoreSpan.innerText = score;
  modal.style.display = 'block';
}

function gameWin() {
  isGameRunning = false;
  victoryScoreSpan.innerText = score;
  victoryModal.style.display = 'block';
}

// 3. 敌人生成
function spawnEnemy() {
  if (!isGameRunning || timeStop) return;
  if (enemies.length >= 8) return;

  const x = Math.random() * (canvas.width - 40) + 20;
  let rand = Math.random();

  let speed = 1, radius = 15, color = 'red', hp = 1, type = 'normal';

  if (rand < 0.15) {
    type = 'heavy'; speed = 0.6; radius = 20; color = '#8B0000'; hp = 3;
  } else if (rand < 0.35) {
    type = 'fast'; speed = 1.8; radius = 12; color = '#8A2BE2'; hp = 1;
  }

  enemies.push({ x, y: -20, radius, speed, color, hp, type, vx: Math.random() < 0.5 ? -1 : 1 });
}
// 设定为 3秒 生成一个
setInterval(spawnEnemy, 3000);

function spawnPowerup() {
  if (!isGameRunning) return;
  const types = ['S', 'T', 'H'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({ x: Math.random() * (canvas.width - 60) + 30, y: Math.random() * (canvas.height - 60) + 30, type: type, w: 20, h: 20 });
}
setInterval(spawnPowerup, 10000);

// 4. Update
function shoot() {
  const now = Date.now();
  if (now - player.lastShotTime > player.shootDelay) {
    playSound(shootSound);
    addShake(2);
    playerBullets.push({ x: player.x, y: player.y, radius: 5, speed: 8, vx: player.dx, vy: player.dy });
    if (player.weaponLevel >= 2) {
      playerBullets.push({ x: player.x, y: player.y, radius: 4, speed: 7, vx: player.dx - 0.3, vy: player.dy });
      playerBullets.push({ x: player.x, y: player.y, radius: 4, speed: 7, vx: player.dx + 0.3, vy: player.dy });
    }
    player.lastShotTime = now;
  }
}

function update() {
  if (!isGameRunning) return;

  // --- 玩家控制 ---
  if (keys[' ']) shoot();
  let moveX = 0, moveY = 0;

  if (keys['ArrowUp']) { moveY = -player.speed; player.dx = 0; player.dy = -1; }
  else if (keys['ArrowDown']) { moveY = player.speed; player.dx = 0; player.dy = 1; }
  else if (keys['ArrowLeft']) { moveX = -player.speed; player.dx = -1; player.dy = 0; }
  else if (keys['ArrowRight']) { moveX = player.speed; player.dx = 1; player.dy = 0; }

  // 玩家碰撞与移动
  let nextX = player.x + moveX;
  let nextY = player.y + moveY;
  let canMove = true;
  steelWalls.forEach(w => { if (circleRectCollision({ x: nextX, y: nextY, radius: player.radius }, w)) canMove = false; });
  brickWalls.forEach(w => { if (circleRectCollision({ x: nextX, y: nextY, radius: player.radius }, w)) canMove = false; });
  if (nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height) canMove = false;
  if (canMove) { player.x = nextX; player.y = nextY; }

  // 吃道具
  powerups.forEach((p, index) => {
    if (circleRectCollision(player, { x: p.x, y: p.y, w: p.w, h: p.h })) {
      powerups.splice(index, 1);
      score += 50; scoreElement.innerText = score;
      playSound(moveSound);
      if (p.type === 'S') { player.weaponLevel = 2; setTimeout(() => player.weaponLevel = 1, 8000); }
      if (p.type === 'T') { timeStop = true; setTimeout(() => timeStop = false, 3000); }
      if (p.type === 'H') { player.hasShield = true; setTimeout(() => player.hasShield = false, 5000); }
    }
  });

  // --- 子弹 ---
  playerBullets.forEach((b, i) => {
    b.x += b.vx * b.speed; b.y += b.vy * b.speed;
    let remove = false;
    steelWalls.forEach(w => { if (circleRectCollision(b, w)) remove = true; });
    brickWalls.forEach((w, wIndex) => {
      if (circleRectCollision(b, w)) {
        brickWalls.splice(wIndex, 1); remove = true; createExplosion(w.x + 15, w.y + 10, '#8B4513');
      }
    });
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height || remove) playerBullets.splice(i, 1);
  });

  enemyBullets.forEach((b, i) => {
    b.x += b.vx * b.speed; b.y += b.vy * b.speed;
    let remove = false;
    steelWalls.forEach(w => { if (circleRectCollision(b, w)) remove = true; });
    brickWalls.forEach((w, wIndex) => { if (circleRectCollision(b, w)) { brickWalls.splice(wIndex, 1); remove = true; } });
    let dx = b.x - player.x, dy = b.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < player.radius + b.radius) {
      if (player.hasShield) remove = true;
      else { createExplosion(player.x, player.y, '#00FF00'); gameOver(); }
    }
    if (remove || b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) enemyBullets.splice(i, 1);
  });

  // --- 敌人逻辑 ---
  enemies.forEach((enemy, i) => {
    if (!timeStop) {
      // 1. 计算移动
      let nextEX = enemy.x + enemy.vx;
      let nextEY = enemy.y + enemy.speed * 0.4;

      let hitWallX = false;
      steelWalls.forEach(w => { if (circleRectCollision({ x: nextEX, y: enemy.y, radius: enemy.radius }, w)) hitWallX = true; });
      brickWalls.forEach(w => { if (circleRectCollision({ x: nextEX, y: enemy.y, radius: enemy.radius }, w)) hitWallX = true; });

      if (hitWallX || nextEX <= 20 || nextEX >= canvas.width - 20) {
        enemy.vx *= -1;
      } else {
        enemy.x = nextEX;
      }

      let hitWallY = false;
      steelWalls.forEach(w => { if (circleRectCollision({ x: enemy.x, y: nextEY, radius: enemy.radius }, w)) hitWallY = true; });
      brickWalls.forEach(w => { if (circleRectCollision({ x: enemy.x, y: nextEY, radius: enemy.radius }, w)) hitWallY = true; });

      if (!hitWallY) {
        enemy.y = nextEY;
      }

      // 2. 射击 (0.5% 概率 + 瞄准)
      if (Math.random() < 0.005) {
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            radius: 5,
            speed: 3,
            vx: dx / dist,
            vy: dy / dist
          });
        }
      }
    }

    if (enemy.y > canvas.height) { enemies.splice(i, 1); return; }

    // --- 伤害检测 ---
    playerBullets.forEach((b, bIndex) => {
      let dx = b.x - enemy.x, dy = b.y - enemy.y;
      if (Math.sqrt(dx * dx + dy * dy) < enemy.radius + b.radius) {
        playerBullets.splice(bIndex, 1);
        enemy.hp -= 1;
        if (enemy.hp > 0) { addShake(2); }
        else {
          createExplosion(enemy.x, enemy.y, enemy.color);
          enemies.splice(i, 1);
          score += (enemy.type === 'heavy' ? 30 : 10);
          scoreElement.innerText = score;

          tanksDestroyed++;
          updateProgressUI();
          if (tanksDestroyed >= TARGET_KILLS) {
            gameWin();
          }
        }
      }
    });

    let pdx = player.x - enemy.x, pdy = player.y - enemy.y;
    if (Math.sqrt(pdx * pdx + pdy * pdy) < player.radius + enemy.radius) {
      if (!player.hasShield) { createExplosion(player.x, player.y, '#00FF00'); gameOver(); }
    }
  });

  particles.forEach((p, i) => {
    p.x += p.vx; p.y += p.vy; p.life -= 0.05;
    if (p.life <= 0) particles.splice(i, 1);
  });

  if (screenShake > 0) screenShake *= 0.9;
  if (screenShake < 0.5) screenShake = 0;
}

// 5. Draw
function draw() {
  ctx.save();
  if (screenShake > 0) {
    let dx = (Math.random() - 0.5) * screenShake * 2;
    let dy = (Math.random() - 0.5) * screenShake * 2;
    ctx.translate(dx, dy);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#777'; ctx.strokeStyle = '#999';
  steelWalls.forEach(w => { ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h); });

  ctx.fillStyle = '#8B4513'; ctx.strokeStyle = '#A0522D';
  brickWalls.forEach(w => { ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h); });

  powerups.forEach(p => {
    ctx.fillStyle = p.type === 'S' ? '#00FFFF' : (p.type === 'T' ? '#FFFF00' : '#FF00FF');
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'black'; ctx.font = '16px Arial'; ctx.fillText(p.type, p.x + 4, p.y + 16);
  });

  enemies.forEach(e => {
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color; ctx.fill();
    if (e.type === 'heavy') { ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText(e.hp, e.x - 3, e.y + 4); }
  });

  if (isGameRunning) {
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color; ctx.fill();
    if (player.hasShield) { ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2); ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + player.dx * 25, player.y + player.dy * 25); ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
  }

  ctx.fillStyle = '#FFFF00'; playerBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#FF4500'; enemyBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });

  particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  // 【关键】记录循环ID，下次开始前要取消它
  animationId = requestAnimationFrame(gameLoop);
}
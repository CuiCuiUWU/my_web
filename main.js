// --- main.js ---

window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
restartBtn.addEventListener('click', restartGame);

// 【新增】辅助函数：播放音效（防止连发时声音卡住）
function playSound(sound) {
  sound.currentTime = 0; // 每次播放前重置进度，实现快速连发
  sound.play().catch(e => console.log("等待用户交互才能播放声音"));
}

function createExplosion(x, y, color) {
  // 【新增】播放爆炸音效
  playSound(explosionSound);

  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x, y: y, radius: Math.random() * 3 + 1, color: color,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1.0
    });
  }
}

function shoot() {
  const now = Date.now();
  if (now - player.lastShotTime > player.shootDelay) {
    playerBullets.push({
      x: player.x, y: player.y, radius: 5, speed: 8,
      vx: player.dx, vy: player.dy
    });
    player.lastShotTime = now;

    // 【新增】播放射击音效
    playSound(shootSound);
  }
}

function spawnEnemy() {
  if (!isGameRunning) return;
  if (enemies.length >= MAX_ENEMIES) return;
  const x = Math.random() * (canvas.width - 40) + 20;
  enemies.push({
    x: x, y: 20, radius: 15, speed: 2, color: 'red',
    vx: Math.random() < 0.5 ? -1.5 : 1.5
  });
}
setInterval(spawnEnemy, 1500);

function gameOver() {
  isGameRunning = false;
  // 游戏结束停止引擎声
  moveSound.pause();
  finalScoreSpan.innerText = score;
  modal.style.display = 'block';
}

function restartGame() {
  modal.style.display = 'none';
  score = 0;
  scoreElement.innerText = score;
  player.x = 400; player.y = 500;
  enemies = [];
  enemyBullets = [];
  playerBullets = [];
  particles = [];
  keys = {};
  isGameRunning = true;
  gameLoop();
}

function update() {
  if (!isGameRunning) return;

  if (keys[' ']) shoot();

  // --- 玩家移动逻辑升级 (加入音效控制) ---
  let moveX = 0, moveY = 0;
  let isMoving = false; // 标记是否在动

  if (keys['ArrowUp']) { moveY = -player.speed; player.dx = 0; player.dy = -1; isMoving = true; }
  else if (keys['ArrowDown']) { moveY = player.speed; player.dx = 0; player.dy = 1; isMoving = true; }
  else if (keys['ArrowLeft']) { moveX = -player.speed; player.dx = -1; player.dy = 0; isMoving = true; }
  else if (keys['ArrowRight']) { moveX = player.speed; player.dx = 1; player.dy = 0; isMoving = true; }

  // 【新增】移动音效逻辑
  if (isMoving) {
    // 如果正在动且声音没在播，就开始播
    if (moveSound.paused) {
      moveSound.play().catch(e => { });
    }
  } else {
    // 如果停下来了，暂停声音并重置
    moveSound.pause();
    moveSound.currentTime = 0;
  }

  let nextX = player.x + moveX;
  let nextY = player.y + moveY;
  let canMove = true;
  walls.forEach(wall => { if (circleRectCollision({ x: nextX, y: nextY, radius: player.radius }, wall)) canMove = false; });
  if (nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height) canMove = false;
  if (canMove) { player.x = nextX; player.y = nextY; }

  // --- 粒子 ---
  particles.forEach((p, index) => {
    p.x += p.vx; p.y += p.vy; p.life -= 0.04;
    if (p.life <= 0) particles.splice(index, 1);
  });

  // --- 玩家子弹 ---
  playerBullets.forEach((bullet, index) => {
    bullet.x += bullet.vx * bullet.speed;
    bullet.y += bullet.vy * bullet.speed;
    let hitWall = false;
    walls.forEach(wall => { if (circleRectCollision(bullet, wall)) hitWall = true; });
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height || hitWall) {
      playerBullets.splice(index, 1);
    }
  });

  // --- 敌人子弹 ---
  enemyBullets.forEach((bullet, index) => {
    bullet.x += bullet.vx * bullet.speed;
    bullet.y += bullet.vy * bullet.speed;
    let hitWall = false;
    walls.forEach(wall => { if (circleRectCollision(bullet, wall)) hitWall = true; });

    let dx = bullet.x - player.x;
    let dy = bullet.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < player.radius + bullet.radius) {
      createExplosion(player.x, player.y, '#00FF00');
      gameOver();
    }

    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height || hitWall) {
      enemyBullets.splice(index, 1);
    }
  });

  // --- 敌人 ---
  enemies.forEach((enemy, eIndex) => {
    enemy.y += enemy.speed * 0.4;
    enemy.x += enemy.vx;
    if (enemy.x <= 20 || enemy.x >= canvas.width - 20) enemy.vx *= -1;

    if (Math.random() < 0.015) {
      enemyBullets.push({
        x: enemy.x, y: enemy.y, radius: 5, speed: 4, vx: 0, vy: 1
      });
    }

    if (enemy.y > canvas.height) {
      enemies.splice(eIndex, 1);
      return;
    }

    playerBullets.forEach((bullet, bIndex) => {
      let dx = bullet.x - enemy.x;
      let dy = bullet.y - enemy.y;
      if (Math.sqrt(dx * dx + dy * dy) < enemy.radius + bullet.radius) {
        // 这里也会触发爆炸音效 (在createExplosion里)
        createExplosion(enemy.x, enemy.y, 'red');
        enemies.splice(eIndex, 1);
        playerBullets.splice(bIndex, 1);
        score += 10;
        scoreElement.innerText = score;
      }
    });

    let pdx = player.x - enemy.x;
    let pdy = player.y - enemy.y;
    if (Math.sqrt(pdx * pdx + pdy * pdy) < player.radius + enemy.radius) {
      createExplosion(player.x, player.y, '#00FF00');
      gameOver();
    }
  });
}

function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#666'; ctx.strokeStyle = '#444';
  walls.forEach(wall => { ctx.fillRect(wall.x, wall.y, wall.w, wall.h); ctx.strokeRect(wall.x, wall.y, wall.w, wall.h); });

  if (isGameRunning) {
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + player.dx * 25, player.y + player.dy * 25);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
  }

  enemies.forEach(enemy => {
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color; ctx.fill();
  });

  ctx.fillStyle = '#FFFF00';
  playerBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#FF4500';
  enemyBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });

  particles.forEach(p => {
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;
  });
}

function gameLoop() {
  if (isGameRunning) update();
  draw();
  if (isGameRunning || particles.length > 0) requestAnimationFrame(gameLoop);
}

gameLoop();
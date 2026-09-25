(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const canvas = byId('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, CX = W / 2, CY = H / 2;
  const ui = {
    score: byId('hud-score'), streak: byId('hud-streak'), lives: byId('hud-lives'),
    message: byId('message'), welcome: byId('welcome-panel'), demoPanel: byId('demo-panel'),
    demoStep: byId('demo-step'), demoTitle: byId('demo-title'), demoCopy: byId('demo-copy'),
    demoAction: byId('demo-action'), complete: byId('complete-panel'),
    demoControls: byId('demo-controls'), scoreForm: byId('score-form'),
    name: byId('name-input'), save: byId('save-btn'), saveError: byId('save-error'),
    restart: byId('restart-btn'), scoresStatus: byId('scores-status'),
    scoresTable: byId('scores-table'), scoreBody: byId('score-body'),
    refreshScores: byId('refresh-scores')
  };

  const MAX_RADIUS = 255;
  const PULSE_SPEED_BASE = 180;
  const LIVES_TOTAL = 3;
  const DEMO_TARGETS = [150, 205];

  let mode = 'welcome', score = 0, streak = 0, lives = LIVES_TOTAL;
  let pulseRadius = 0, pulseGrowing = true, pulseSpeed = PULSE_SPEED_BASE;
  let targets = [], lastTime = performance.now(), targetSpawnTimer = 0;
  let targetLifespan = 3, roundTargets = 0, difficulty = 1;
  let demoStage = 0, demoHits = 0, saving = false, messageTimer = 0;

  function resetRound(nextMode) {
    mode = nextMode;
    score = 0; streak = 0; lives = LIVES_TOTAL;
    pulseRadius = 0; pulseGrowing = true;
    pulseSpeed = nextMode === 'demo' ? 120 : PULSE_SPEED_BASE;
    targets = []; targetSpawnTimer = 0; targetLifespan = 3;
    roundTargets = 0; difficulty = 1; messageTimer = 0; saving = false;
    ui.score.textContent = '0';
    ui.streak.textContent = '0';
    ui.lives.textContent = String(LIVES_TOTAL);
    ui.message.textContent = '';
    ui.scoreForm.hidden = true;
    ui.restart.hidden = true;
    ui.complete.hidden = true;
    ui.welcome.hidden = true;
    ui.demoPanel.hidden = true;
    ui.demoControls.hidden = nextMode !== 'demo';
    ui.save.disabled = false;
    ui.save.textContent = 'Save score';
    ui.saveError.textContent = '';
    if (nextMode === 'playing') {
      spawnTarget();
      canvas.focus();
    } else {
      startDemoSequence();
    }
  }

  function showWelcome() {
    mode = 'welcome';
    score = 0;
    streak = 0;
    lives = LIVES_TOTAL;
    targets = [];
    pulseRadius = 92;
    syncHud();
    ui.welcome.hidden = false;
    ui.demoPanel.hidden = true;
    ui.complete.hidden = true;
    ui.demoControls.hidden = true;
    ui.scoreForm.hidden = true;
    ui.restart.hidden = true;
    ui.message.textContent = '';
  }

  function startDemoSequence() {
    demoStage = 0;
    demoHits = 0;
    targets = [createTarget(DEMO_TARGETS[0], 5, Infinity)];
    ui.demoPanel.hidden = false;
    setDemoCoach(1, 'Follow the cyan pulse',
      'It expands from the center, then returns. The coral ring is your target.', 'I see it');
    ui.demoAction.hidden = false;
    ui.demoAction.focus();
  }

  function setDemoCoach(step, title, copy, actionLabel) {
    ui.demoStep.textContent = String(step);
    ui.demoTitle.textContent = title;
    ui.demoCopy.textContent = copy;
    ui.demoAction.textContent = actionLabel;
  }

  function advanceDemo() {
    if (mode !== 'demo' || demoStage !== 0) return;
    demoStage = 1;
    setDemoCoach(2, 'Match the rings',
      'Press Space, Enter, or tap the arena when the cyan pulse overlaps the coral target. Misses are free here.', '');
    ui.demoAction.hidden = true;
    canvas.focus();
  }

  function completeDemo() {
    if (mode !== 'demo') return;
    mode = 'demo-complete';
    ui.demoPanel.hidden = true;
    ui.demoControls.hidden = true;
    ui.complete.hidden = false;
    ui.message.textContent = '';
    byId('demo-play-btn').focus();
  }

  function createTarget(radius, hue = Math.random() * 360, maxAge = targetLifespan) {
    return { radius, age: 0, maxAge, hue, hit: false, fadeOut: 0 };
  }

  function spawnTarget() {
    targets.push(createTarget(60 + Math.random() * (MAX_RADIUS - 75)));
    roundTargets++;
  }

  function update(dt) {
    if (!['playing', 'demo'].includes(mode)) return;
    pulseRadius += (pulseGrowing ? 1 : -1) * pulseSpeed * dt;
    if (pulseRadius >= MAX_RADIUS) {
      pulseRadius = MAX_RADIUS; pulseGrowing = false;
    } else if (pulseRadius <= 0) {
      pulseRadius = 0; pulseGrowing = true;
    }

    for (let index = targets.length - 1; index >= 0; index--) {
      const target = targets[index];
      if (target.hit) {
        target.fadeOut -= dt;
        if (target.fadeOut <= 0) targets.splice(index, 1);
        continue;
      }
      if (mode === 'demo') continue;
      target.age += dt;
      if (target.age >= target.maxAge) {
        lives--;
        streak = 0;
        syncHud();
        targets.splice(index, 1);
        if (lives <= 0) {
          endGame();
          return;
        }
        flashMessage('Miss — one life lost', '#ff9189');
      }
    }

    if (mode !== 'playing') return;
    targetSpawnTimer += dt;
    const spawnInterval = Math.max(.8, 2 - difficulty * .12);
    const activeTargets = targets.filter((target) => !target.hit).length;
    if (targetSpawnTimer >= spawnInterval && activeTargets < 3 + Math.floor(difficulty / 3)) {
      targetSpawnTimer = 0;
      spawnTarget();
    }
    difficulty = Math.min(15, 1 + Math.floor(roundTargets / 8));
    pulseSpeed = PULSE_SPEED_BASE + difficulty * 12;
    targetLifespan = Math.max(1.4, 3 - difficulty * .1);
  }

  function tryHit() {
    if (!['playing', 'demo'].includes(mode) || (mode === 'demo' && demoStage === 0)) return;
    let bestTarget = null, bestDistance = Infinity;
    for (const target of targets) {
      if (target.hit) continue;
      const distance = Math.abs(pulseRadius - target.radius);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTarget = target;
      }
    }
    if (!bestTarget) return;

    const tolerance = mode === 'demo' ? 32 : 28 - Math.min(difficulty, 10);
    if (bestDistance <= tolerance) {
      bestTarget.hit = true;
      bestTarget.fadeOut = .35;
      const accuracy = 1 - bestDistance / tolerance;
      let points = Math.round(10 + 90 * accuracy * accuracy);
      streak++;
      if (streak >= 5) points = Math.round(points * 1.5);
      else if (streak >= 3) points = Math.round(points * 1.2);
      score += points;
      syncHud();
      const label = accuracy > .9 ? 'Perfect' : accuracy > .6 ? 'Great' : 'Hit';
      flashMessage(`${label} · +${points}`, accuracy > .6 ? '#78f7ed' : '#d7df86');
      if (mode === 'demo') handleDemoHit(label);
    } else if (mode === 'demo') {
      flashMessage('Almost — wait for the rings to overlap', '#ffcf70', 1.3);
    } else {
      lives--;
      streak = 0;
      syncHud();
      if (lives <= 0) endGame();
      else flashMessage('Miss — one life lost', '#ff9189');
    }
  }

  function handleDemoHit(label) {
    demoHits++;
    if (demoHits === 1) {
      demoStage = 2;
      window.setTimeout(() => {
        if (mode !== 'demo') return;
        targets = [createTarget(DEMO_TARGETS[1], 42, Infinity)];
        pulseRadius = 0;
        pulseGrowing = true;
        setDemoCoach(3, `${label}! Now build a streak`,
          'Consecutive hits grow your streak. Land one more—the amber ring is farther out.', '');
        ui.demoPanel.hidden = false;
      }, 450);
    } else {
      window.setTimeout(completeDemo, 550);
    }
  }

  function syncHud() {
    ui.score.textContent = String(score);
    ui.streak.textContent = String(streak);
    ui.lives.textContent = String(lives);
  }

  function flashMessage(text, color, duration = 1) {
    ui.message.textContent = text;
    ui.message.style.color = color;
    messageTimer = duration;
  }

  function endGame() {
    mode = 'ended';
    ui.message.textContent = `Game over · Score ${score}`;
    ui.message.style.color = '#ff9189';
    ui.scoreForm.hidden = false;
    ui.restart.hidden = false;
    ui.name.focus();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080914';
    ctx.beginPath(); ctx.arc(CX, CY, MAX_RADIUS + 25, 0, Math.PI * 2); ctx.fill();
    for (let radius = 60; radius <= MAX_RADIUS; radius += 60) {
      ctx.strokeStyle = 'rgba(99,109,148,.16)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(CX, CY, radius, 0, Math.PI * 2); ctx.stroke();
    }
    for (const target of targets) {
      const alpha = target.hit ? target.fadeOut / .35 :
        target.maxAge === Infinity ? .95 : Math.max(0, 1 - target.age / target.maxAge);
      const urgency = target.maxAge === Infinity ? 0 : target.age / target.maxAge;
      ctx.strokeStyle = `hsla(${target.hue},85%,${66 + urgency * 16}%,${alpha})`;
      ctx.lineWidth = 8;
      ctx.shadowColor = `hsla(${target.hue},90%,65%,${alpha * .55})`;
      ctx.shadowBlur = target.hit ? 28 : 10 + urgency * 15;
      ctx.beginPath(); ctx.arc(CX, CY, target.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      if (!target.hit && target.maxAge !== Infinity) {
        const remaining = 1 - target.age / target.maxAge;
        ctx.strokeStyle = `hsla(${target.hue},90%,78%,${alpha * .45})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, CY, target.radius + 10, -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * remaining);
        ctx.stroke();
      }
    }
    const pulseAlpha = .72 + .2 * Math.sin(performance.now() / 180);
    ctx.strokeStyle = `rgba(120,247,237,${pulseAlpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(120,247,237,.62)';
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(CX, CY, Math.max(1, pulseRadius), 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#78f7ed';
    ctx.beginPath(); ctx.arc(CX, CY, 5, 0, Math.PI * 2); ctx.fill();
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, .1);
    lastTime = timestamp;
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0 && mode !== 'ended') ui.message.textContent = '';
    }
    update(dt);
    draw();
    window.requestAnimationFrame(loop);
  }

  async function saveScore(event) {
    event.preventDefault();
    if (saving || mode !== 'ended') return;
    const name = ui.name.value.trim();
    if (!name) {
      ui.saveError.textContent = 'Enter a name to save your score.';
      ui.name.focus();
      return;
    }
    saving = true;
    ui.save.disabled = true;
    ui.save.textContent = 'Saving…';
    ui.saveError.textContent = '';
    try {
      const response = await fetch('api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Unable to save score (${response.status}).`);
      ui.scoreForm.hidden = true;
      flashMessage('Score saved', '#a4f59f', 2);
      await loadScores();
    } catch (error) {
      ui.saveError.textContent = error.message;
      ui.save.disabled = false;
      ui.save.textContent = 'Try again';
      saving = false;
    }
  }

  async function loadScores() {
    ui.refreshScores.disabled = true;
    ui.scoresStatus.hidden = false;
    ui.scoresStatus.textContent = 'Loading scores…';
    ui.scoresTable.hidden = true;
    try {
      const response = await fetch('api/scores');
      const rows = await response.json().catch(() => null);
      if (!response.ok) throw new Error(rows?.error || `Unable to load scores (${response.status}).`);
      ui.scoreBody.replaceChildren();
      if (!rows.length) {
        ui.scoresStatus.textContent = 'No scores yet. Finish a round to set the first one.';
        return;
      }
      rows.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        [String(index + 1).padStart(2, '0'), row.name, String(row.score)].forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          tableRow.appendChild(cell);
        });
        ui.scoreBody.appendChild(tableRow);
      });
      ui.scoresStatus.hidden = true;
      ui.scoresTable.hidden = false;
    } catch (error) {
      ui.scoresStatus.textContent = error.message;
    } finally {
      ui.refreshScores.disabled = false;
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    tryHit();
  });
  canvas.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.key === 'Enter') {
      event.preventDefault();
      tryHit();
    }
  });
  document.addEventListener('keydown', (event) => {
    const element = document.activeElement;
    const isEditing = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    if (event.code === 'Space' && !isEditing && ['playing', 'demo'].includes(mode) &&
        element !== canvas) {
      event.preventDefault();
      tryHit();
    }
    if (event.key === 'Escape' && mode === 'demo') showWelcome();
  });

  byId('demo-btn').addEventListener('click', () => resetRound('demo'));
  byId('play-btn').addEventListener('click', () => resetRound('playing'));
  byId('how-to-btn').addEventListener('click', () => resetRound('demo'));
  byId('exit-demo-btn').addEventListener('click', showWelcome);
  byId('demo-play-btn').addEventListener('click', () => resetRound('playing'));
  byId('replay-demo-btn').addEventListener('click', () => resetRound('demo'));
  ui.demoAction.addEventListener('click', advanceDemo);
  ui.restart.addEventListener('click', () => resetRound('playing'));
  ui.scoreForm.addEventListener('submit', saveScore);
  ui.name.addEventListener('input', () => { ui.saveError.textContent = ''; });
  ui.refreshScores.addEventListener('click', loadScores);

  showWelcome();
  loadScores();
  window.requestAnimationFrame(loop);
})();

const memoryGrid = document.querySelector('#memory-grid');
const memoryStatus = document.querySelector('#memory-status');
const memoryReset = document.querySelector('#memory-reset');

const agents = [
  { id: 'X', name: 'Xander', image: 'assets/core/xander.webp' },
  { id: 'Y', name: 'Yuri', image: 'assets/core/yuri.webp' },
  { id: 'Z', name: 'Zaya', image: 'assets/core/zaya.webp' },
  { id: 'E', name: 'EVE', image: 'assets/core/eve.webp' }
];

let openCards = [];
let matchedPairs = 0;
let memoryTurns = 0;
let memoryLocked = false;

function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function updateMemoryStatus() {
  memoryStatus.textContent = matchedPairs === agents.length
    ? `You found the whole League in ${memoryTurns} turns!`
    : `${matchedPairs} pairs found · ${memoryTurns} turns`;
}

function chooseMemoryCard(button) {
  if (memoryLocked || button.classList.contains('flipped') || button.classList.contains('matched')) return;
  button.classList.add('flipped');
  button.setAttribute('aria-pressed', 'true');
  openCards.push(button);
  if (openCards.length < 2) return;

  memoryTurns += 1;
  const [first, second] = openCards;
  if (first.dataset.agent === second.dataset.agent) {
    first.classList.add('matched');
    second.classList.add('matched');
    first.setAttribute('aria-label', `${first.dataset.name} matched`);
    second.setAttribute('aria-label', `${second.dataset.name} matched`);
    openCards = [];
    matchedPairs += 1;
    updateMemoryStatus();
    return;
  }

  memoryLocked = true;
  updateMemoryStatus();
  window.setTimeout(() => {
    first.classList.remove('flipped');
    second.classList.remove('flipped');
    first.setAttribute('aria-pressed', 'false');
    second.setAttribute('aria-pressed', 'false');
    openCards = [];
    memoryLocked = false;
  }, 800);
}

function buildMemoryGame() {
  openCards = [];
  matchedPairs = 0;
  memoryTurns = 0;
  memoryLocked = false;
  const deck = shuffled([...agents, ...agents]);
  memoryGrid.replaceChildren(...deck.map((agent) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-card';
    button.dataset.agent = agent.id;
    button.dataset.name = agent.name;
    button.setAttribute('aria-label', 'Hidden character card');
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="memory-face memory-back" aria-hidden="true">◇</span><span class="memory-face memory-front" data-agent="${agent.id}" aria-hidden="true"><img src="${agent.image}" alt=""></span>`;
    button.addEventListener('click', () => chooseMemoryCard(button));
    return button;
  }));
  updateMemoryStatus();
}

memoryReset?.addEventListener('click', buildMemoryGame);
if (memoryGrid) buildMemoryGame();

const episodeRail = document.querySelector('#episode-rail');
document.querySelector('#episodes-back')?.addEventListener('click', () => episodeRail.scrollBy({ left: -episodeRail.clientWidth * .82, behavior: 'smooth' }));
document.querySelector('#episodes-next')?.addEventListener('click', () => episodeRail.scrollBy({ left: episodeRail.clientWidth * .82, behavior: 'smooth' }));

const repairField = document.querySelector('#repair-field');
const repairStatus = document.querySelector('#repair-status');
const repairStart = document.querySelector('#repair-start');
const cannon = document.querySelector('#logic-cannon');
let repairs = 0;
let repairActive = false;
let currentBug = null;
let shotLocked = false;

function playRepairTone() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, context.currentTime + index * .065);
    gain.gain.exponentialRampToValueAtTime(.055, context.currentTime + index * .065 + .014);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + index * .065 + .12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * .065);
    oscillator.stop(context.currentTime + index * .065 + .14);
  });
  window.setTimeout(() => context.close(), 500);
}

function fieldPoint(event) {
  const rect = repairField.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function cannonOrigin() {
  return { x: repairField.clientWidth / 2, y: repairField.clientHeight - 52 };
}

function aimCannon(point) {
  const origin = cannonOrigin();
  const angle = Math.atan2(point.y - origin.y, point.x - origin.x) * 180 / Math.PI;
  cannon.style.setProperty('--aim', `${angle}deg`);
}

function spawnBug() {
  if (!repairActive || currentBug) return;
  const bug = document.createElement('button');
  bug.type = 'button';
  bug.className = 'glitch-bug';
  bug.textContent = '⌁';
  bug.setAttribute('aria-label', 'Glitch bug. Aim and fire a repair pulse.');
  bug.style.left = `${10 + Math.random() * 72}%`;
  bug.style.top = `${8 + Math.random() * 48}%`;
  bug.addEventListener('click', (event) => {
    event.stopPropagation();
    const fieldRect = repairField.getBoundingClientRect();
    const bugRect = bug.getBoundingClientRect();
    fireAt({ x: bugRect.left - fieldRect.left + bugRect.width / 2, y: bugRect.top - fieldRect.top + bugRect.height / 2 });
  });
  currentBug = bug;
  repairField.append(bug);
}

function finishRepairMission() {
  repairActive = false;
  shotLocked = false;
  currentBug = null;
  repairStatus.textContent = 'Mission complete · Six data bunnies are safely home!';
  repairStart.textContent = 'Play again';
  const message = document.createElement('div');
  message.className = 'repair-idle';
  message.textContent = 'Mission complete!';
  repairField.append(message);
}

function repairBug() {
  if (!currentBug) return;
  const bug = currentBug;
  currentBug = null;
  const left = bug.offsetLeft;
  const top = bug.offsetTop;
  bug.remove();

  const bunny = document.createElement('span');
  bunny.className = 'data-bunny';
  bunny.textContent = '🐇';
  bunny.style.left = `${left}px`;
  bunny.style.top = `${top}px`;
  repairField.append(bunny);
  playRepairTone();
  repairs += 1;
  repairStatus.textContent = repairs === 1 ? '1 of 6 bugs repaired' : `${repairs} of 6 bugs repaired`;

  window.setTimeout(() => bunny.remove(), 1400);
  window.setTimeout(() => {
    shotLocked = false;
    if (repairs >= 6) finishRepairMission();
    else spawnBug();
  }, 700);
}

function fireAt(point) {
  if (!repairActive || shotLocked) return;
  shotLocked = true;
  aimCannon(point);
  const origin = cannonOrigin();
  const shot = document.createElement('span');
  shot.className = 'pulse-shot';
  shot.style.left = `${origin.x - 6}px`;
  shot.style.top = `${origin.y - 6}px`;
  shot.style.setProperty('--dx', `${point.x - origin.x}px`);
  shot.style.setProperty('--dy', `${point.y - origin.y}px`);
  repairField.append(shot);

  let hit = false;
  if (currentBug) {
    const bugCenter = { x: currentBug.offsetLeft + currentBug.offsetWidth / 2, y: currentBug.offsetTop + currentBug.offsetHeight / 2 };
    hit = Math.hypot(point.x - bugCenter.x, point.y - bugCenter.y) < 58;
  }

  window.setTimeout(() => {
    shot.remove();
    if (hit) repairBug();
    else {
      const miss = document.createElement('span');
      miss.className = 'miss-pulse';
      miss.style.left = `${point.x - 11}px`;
      miss.style.top = `${point.y - 11}px`;
      repairField.append(miss);
      window.setTimeout(() => miss.remove(), 500);
      shotLocked = false;
      repairStatus.textContent = `${repairs} of 6 repaired · Adjust your aim!`;
    }
  }, 250);
}

function startRepairMission() {
  repairField.querySelectorAll('.glitch-bug,.data-bunny,.pulse-shot,.miss-pulse,.repair-idle').forEach((item) => item.remove());
  repairs = 0;
  repairActive = true;
  shotLocked = false;
  currentBug = null;
  repairStart.textContent = 'Restart';
  repairStatus.textContent = '0 of 6 bugs repaired';
  spawnBug();
}

repairField?.addEventListener('pointermove', (event) => aimCannon(fieldPoint(event)));
repairField?.addEventListener('click', (event) => fireAt(fieldPoint(event)));
repairStart?.addEventListener('click', startRepairMission);

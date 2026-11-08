const memoryGrid = document.querySelector('#memory-grid');
const memoryStatus = document.querySelector('#memory-status');
const memoryReset = document.querySelector('#memory-reset');

const agents = [
  { id: 'X', icon: '➤', name: 'Xander' },
  { id: 'Y', icon: '↔', name: 'Yuri' },
  { id: 'Z', icon: '↑', name: 'Zaya' },
  { id: 'E', icon: '◇', name: 'EVE' }
];

let openCards = [];
let matchedPairs = 0;
let memoryMoves = 0;
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
    ? `Mission complete · ${memoryMoves} moves`
    : `${matchedPairs} pairs · ${memoryMoves} moves`;
}

function chooseMemoryCard(button) {
  if (memoryLocked || button.classList.contains('flipped') || button.classList.contains('matched')) return;
  button.classList.add('flipped');
  button.setAttribute('aria-pressed', 'true');
  openCards.push(button);
  if (openCards.length < 2) return;
  memoryMoves += 1;
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
  }, 720);
}

function buildMemoryGame() {
  openCards = [];
  matchedPairs = 0;
  memoryMoves = 0;
  memoryLocked = false;
  const deck = shuffled([...agents, ...agents]);
  memoryGrid.replaceChildren(...deck.map((agent) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-card';
    button.dataset.agent = agent.id;
    button.dataset.name = agent.name;
    button.setAttribute('aria-label', 'Hidden signal card');
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="memory-face memory-back" aria-hidden="true">◇</span><span class="memory-face memory-front" data-agent="${agent.id}" aria-hidden="true">${agent.icon}</span>`;
    button.addEventListener('click', () => chooseMemoryCard(button));
    return button;
  }));
  updateMemoryStatus();
}

memoryReset?.addEventListener('click', buildMemoryGame);
if (memoryGrid) buildMemoryGame();

const repairField = document.querySelector('#repair-field');
const repairStatus = document.querySelector('#repair-status');
const repairStart = document.querySelector('#repair-start');
let repairTimer = null;
let repairDeadline = 0;
let repairs = 0;
let repairActive = false;

function playRepairTone() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + index * 0.07 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.07 + 0.13);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * 0.07);
    oscillator.stop(context.currentTime + index * 0.07 + 0.15);
  });
  window.setTimeout(() => context.close(), 500);
}

function spawnPacket() {
  if (!repairActive || repairField.querySelector('.packet')) return;
  const packet = document.createElement('button');
  packet.type = 'button';
  packet.className = 'packet';
  packet.textContent = '⌁';
  packet.setAttribute('aria-label', 'Repair corrupted packet');
  packet.style.left = `${8 + Math.random() * 78}%`;
  packet.style.top = `${10 + Math.random() * 65}%`;
  packet.addEventListener('click', () => {
    if (!repairActive || packet.classList.contains('repaired')) return;
    const pulse = document.createElement('span');
    pulse.className = 'repair-pulse';
    pulse.style.left = packet.style.left;
    pulse.style.top = packet.style.top;
    repairField.append(pulse);
    packet.classList.add('repaired');
    packet.textContent = '🐇';
    repairs += 1;
    playRepairTone();
    window.setTimeout(() => {
      packet.remove();
      pulse.remove();
      if (repairs >= 6) finishRepairMission(true);
      else spawnPacket();
    }, 520);
  });
  repairField.append(packet);
}

function finishRepairMission(success) {
  repairActive = false;
  window.clearInterval(repairTimer);
  repairField.querySelectorAll('.packet,.repair-pulse').forEach((item) => item.remove());
  const message = document.createElement('div');
  message.className = 'repair-idle';
  message.textContent = success ? 'Mission complete · packet restored' : `Signal closed · ${repairs} of 6 repaired`;
  repairField.replaceChildren(message);
  repairStatus.textContent = success ? '6 data bunnies · complete' : `${repairs} repairs · try a new mission`;
  repairStart.textContent = 'New mission';
}

function startRepairMission() {
  window.clearInterval(repairTimer);
  repairs = 0;
  repairActive = true;
  repairDeadline = Date.now() + 20000;
  repairField.replaceChildren();
  repairStart.textContent = 'Restart';
  spawnPacket();
  repairTimer = window.setInterval(() => {
    const remaining = Math.max(0, Math.ceil((repairDeadline - Date.now()) / 1000));
    repairStatus.textContent = `${repairs} of 6 repaired · ${remaining} seconds`;
    if (remaining <= 0) finishRepairMission(false);
  }, 250);
}

repairStart?.addEventListener('click', startRepairMission);

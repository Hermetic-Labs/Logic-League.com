const cityCanvas = document.querySelector('#point-cloud-city');

async function initPointCloudCity() {
  if (!cityCanvas) return;
  const banner = cityCanvas.closest('.world-banner');
  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.min.js');
    const renderer = new THREE.WebGLRenderer({ canvas: cityCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
    camera.position.set(0, 5.5, 17.5);
    camera.lookAt(0, 2.3, 0);

    const city = new THREE.Group();
    city.position.y = -1.2;
    scene.add(city);

    const positions = [];
    const colors = [];
    const bases = [];
    const cyan = new THREE.Color(0x22c9ff);
    const blue = new THREE.Color(0x147dff);
    const violet = new THREE.Color(0xa755ff);
    let seed = 73621;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const addPoint = (x, y, z, brightness = 0) => {
      positions.push(x, y, z);
      bases.push(x, y, z);
      const mix = Math.max(0, Math.min(1, (x + 11) / 22));
      const color = (mix < .58 ? cyan.clone().lerp(blue, mix) : blue.clone().lerp(violet, (mix - .58) / .42));
      color.lerp(new THREE.Color(0xffffff), Math.min(.34, brightness));
      colors.push(color.r, color.g, color.b);
    };

    for (let x = -12; x <= 12; x += .55) {
      for (let z = -7; z <= 4.5; z += .62) addPoint(x, 0, z, .04);
    }

    for (let building = 0; building < 30; building += 1) {
      const x = -10.7 + random() * 21.4;
      const z = -4.6 + random() * 7.7;
      const width = .48 + random() * 1.15;
      const depth = .45 + random() * 1.05;
      const height = 1.3 + random() * (z < -1.5 ? 4.4 : 7.2);
      const step = .34;
      for (let y = .12; y <= height; y += step) {
        for (let edgeX = -width / 2; edgeX <= width / 2; edgeX += step) {
          addPoint(x + edgeX, y, z - depth / 2, y / height * .22);
          addPoint(x + edgeX, y, z + depth / 2, y / height * .22);
        }
        for (let edgeZ = -depth / 2; edgeZ <= depth / 2; edgeZ += step) {
          addPoint(x - width / 2, y, z + edgeZ, y / height * .22);
          addPoint(x + width / 2, y, z + edgeZ, y / height * .22);
        }
      }
      for (let roofX = -width / 2; roofX <= width / 2; roofX += step) {
        for (let roofZ = -depth / 2; roofZ <= depth / 2; roofZ += step) addPoint(x + roofX, height, z + roofZ, .32);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: .068, transparent: true, opacity: .92, vertexColors: true, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material);
    city.add(points);

    const ringMaterial = new THREE.LineBasicMaterial({ color: 0x4ccfff, transparent: true, opacity: .28 });
    [4.8, 7.1].forEach((radius, index) => {
      const ringPoints = Array.from({ length: 96 }, (_, point) => {
        const angle = point / 96 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * radius, 6.2 + index * .4, Math.sin(angle) * radius * .27 - .5);
      });
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints), ringMaterial.clone());
      ring.rotation.x = -.1;
      city.add(ring);
    });

    let pointerX = 0;
    let pointerY = 0;
    let pulse = null;
    let frame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const positionAttribute = geometry.getAttribute('position');

    const resize = () => {
      const width = Math.max(1, banner.clientWidth);
      const height = Math.max(1, banner.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 1 ? 23 : 17.5;
      camera.updateProjectionMatrix();
    };

    const setPointer = (event) => {
      const rect = banner.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    };

    const launchPulse = (event) => {
      const rect = banner.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const relativeY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      pulse = { x: (relativeX - .5) * 20, z: (relativeY - .48) * 8, started: performance.now() };
      banner.classList.remove('city-pulsed');
      requestAnimationFrame(() => banner.classList.add('city-pulsed'));
    };

    banner.addEventListener('pointermove', setPointer);
    banner.addEventListener('pointerdown', launchPulse);
    new ResizeObserver(resize).observe(banner);
    resize();
    banner.classList.add('city-live');

    const render = (now = performance.now()) => {
      city.rotation.y += (pointerX * .035 - city.rotation.y) * .045;
      city.rotation.x += (-pointerY * .015 - city.rotation.x) * .045;
      if (pulse && !reducedMotion) {
        const age = (now - pulse.started) / 1000;
        const radius = age * 5.8;
        for (let index = 0; index < bases.length; index += 3) {
          const distance = Math.hypot(bases[index] - pulse.x, bases[index + 2] - pulse.z);
          const wave = Math.exp(-Math.pow(distance - radius, 2) * 1.15) * Math.sin(age * 9 - distance * 1.9) * .9 * Math.max(0, 1 - age / 2.25);
          positionAttribute.array[index + 1] = bases[index + 1] + wave;
        }
        positionAttribute.needsUpdate = true;
        if (age > 2.25) pulse = null;
      }
      city.children.slice(1).forEach((ring, index) => { ring.rotation.z = now * .00008 * (index % 2 ? -1 : 1); });
      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    render();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !reducedMotion && !frame) frame = requestAnimationFrame(render);
      if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    });
  } catch (error) {
    banner?.classList.add('city-static');
  }
}

initPointCloudCity();

const memoryGrid = document.querySelector('#memory-grid');
const memoryStatus = document.querySelector('#memory-status');
const memoryReset = document.querySelector('#memory-reset');

const agents = [
  { id: 'X', name: 'Xander', image: 'assets/core/xander.webp' },
  { id: 'Y', name: 'Yuri', image: 'assets/core/yuri.webp' },
  { id: 'Z', name: 'Zaya', image: 'assets/core/zaya.webp' },
  { id: 'E', name: 'EVE', image: 'assets/core/eve.webp?v=axis-v2' },
  { id: 'BC', name: 'Baby Chief', image: 'assets/cast/baby-chief.webp' },
  { id: 'C', name: 'Cipher', image: 'assets/cast/cipher.webp' },
  { id: 'CB', name: 'Click Bait', image: 'assets/cast/click-bait.webp' }
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
    ? `Signal synced! You found the whole cast in ${memoryTurns} turns!`
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
const repairDrone = document.querySelector('#repair-drone');
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

function droneOrigin() {
  return { x: repairField.clientWidth / 2, y: repairField.clientHeight - 42 };
}

function aimDrone(point) {
  const origin = droneOrigin();
  const tilt = Math.max(-16, Math.min(16, (point.x - origin.x) / repairField.clientWidth * 34));
  repairDrone.style.setProperty('--tilt', `${tilt}deg`);
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
  aimDrone(point);
  const origin = droneOrigin();
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

repairField?.addEventListener('pointermove', (event) => aimDrone(fieldPoint(event)));
repairField?.addEventListener('click', (event) => fireAt(fieldPoint(event)));
repairStart?.addEventListener('click', startRepairMission);

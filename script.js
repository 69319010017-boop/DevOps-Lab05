const rows = 4;
const cols = 5;
const totalTiles = rows * cols;

const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const statusEl = document.getElementById('status');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');
const musicToggleBtn = document.getElementById('musicToggleBtn');
const applyMusicBtn = document.getElementById('applyMusicBtn');
const youtubeLinkInput = document.getElementById('youtubeLinkInput');
const musicFrameWrap = document.getElementById('musicFrameWrap');
const musicFrame = document.getElementById('musicFrame');
const effectToggleBtn = document.getElementById('effectToggleBtn');
const effectVolumeSlider = document.getElementById('effectVolume');
const effectVolumeValue = document.getElementById('effectVolumeValue');

let tiles = [];
let selectedIndex = null;
let moves = 0;
let isSolved = false;
let musicEnabled = false;
let effectsEnabled = true;
let audioContext = null;
let effectVolume = Number(effectVolumeSlider.value) / 100;

function convertYouTubeUrlToEmbed(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    let videoId = '';

    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.replace('/', '');
    } else if (parsed.hostname.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v') || '';
    }

    if (!videoId) return '';

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}`;
  } catch (error) {
    return '';
  }
}

function ensureAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration, type = 'sine', volume = 0.05) {
  const context = ensureAudioContext();
  if (!context || !effectsEnabled) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.value = volume * effectVolume;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  gainNode.gain.setValueAtTime(volume * effectVolume, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
}

function playSwapSound() {
  playTone(420, 0.08, 'triangle', 0.06);
  setTimeout(() => playTone(540, 0.08, 'triangle', 0.05), 60);
}

function playWinSound() {
  playTone(660, 0.18, 'sine', 0.08);
  setTimeout(() => playTone(880, 0.18, 'triangle', 0.08), 120);
  setTimeout(() => playTone(1040, 0.22, 'sine', 0.08), 240);
}

function buildSolvedTiles() {
  return Array.from({ length: totalTiles }, (_, index) => index);
}

function isBoardSolved() {
  return tiles.every((tile, index) => tile === index);
}

function updateStatus() {
  if (isSolved) {
    statusEl.textContent = 'Puzzle complete! You solved the car image.';
    statusEl.classList.add('success');
    return;
  }

  if (selectedIndex !== null) {
    statusEl.textContent = 'Tile selected. Choose another tile to swap.';
    statusEl.classList.remove('success');
    return;
  }

  statusEl.textContent = 'Select a tile, then choose another tile to swap.';
  statusEl.classList.remove('success');
}

function renderBoard() {
  board.innerHTML = '';

  tiles.forEach((tileId, index) => {
    const piece = document.createElement('button');
    piece.type = 'button';
    piece.className = 'tile';
    piece.setAttribute('aria-label', `Puzzle tile ${tileId + 1}`);

    const row = Math.floor(tileId / cols);
    const col = tileId % cols;
    const xPercent = (col / (cols - 1)) * 100;
    const yPercent = (row / (rows - 1)) * 100;

    piece.style.backgroundImage = "url('car.jpg')";
    piece.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

    if (selectedIndex === index) {
      piece.classList.add('selected');
    }

    piece.addEventListener('click', () => handleTileClick(index));
    board.appendChild(piece);
  });

  movesEl.textContent = String(moves);
  updateStatus();
}

function applyMusicFromInput() {
  const rawValue = youtubeLinkInput.value.trim();
  const embedUrl = convertYouTubeUrlToEmbed(rawValue);

  if (!embedUrl) {
    statusEl.textContent = 'Please enter a valid YouTube link.';
    statusEl.classList.remove('success');
    return;
  }

  musicFrame.src = embedUrl;
  musicFrameWrap.classList.remove('hidden');
  musicEnabled = true;
  musicToggleBtn.textContent = 'Music: On';
  statusEl.textContent = 'Music loaded from the YouTube link.';
  statusEl.classList.remove('success');
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  musicToggleBtn.textContent = musicEnabled ? 'Music: On' : 'Music: Off';

  if (musicEnabled) {
    const rawValue = youtubeLinkInput.value.trim();
    const embedUrl = convertYouTubeUrlToEmbed(rawValue);

    if (embedUrl) {
      musicFrame.src = embedUrl;
      musicFrameWrap.classList.remove('hidden');
      statusEl.textContent = 'Music is playing in the background.';
      statusEl.classList.remove('success');
    } else {
      musicEnabled = false;
      musicToggleBtn.textContent = 'Music: Off';
      musicFrame.src = '';
      musicFrameWrap.classList.add('hidden');
      statusEl.textContent = 'Paste a valid YouTube link first.';
      statusEl.classList.remove('success');
    }
  } else {
    musicFrame.src = '';
    musicFrameWrap.classList.add('hidden');
    updateStatus();
  }
}

function toggleEffects() {
  effectsEnabled = !effectsEnabled;
  effectToggleBtn.textContent = `Effect: ${effectsEnabled ? 'On' : 'Off'}`;
  statusEl.textContent = effectsEnabled ? 'Effect sounds enabled.' : 'Effect sounds muted.';
  statusEl.classList.remove('success');
}

function updateEffectVolumeLabel() {
  effectVolumeValue.textContent = `${Math.round(effectVolume * 100)}%`;
}

function setEffectVolume(value) {
  effectVolume = Math.min(1, Math.max(0, value));
  effectVolumeSlider.value = String(Math.round(effectVolume * 100));
  updateEffectVolumeLabel();
}

function handleEffectVolumeInput() {
  setEffectVolume(Number(effectVolumeSlider.value) / 100);
}

function handleTileClick(index) {
  if (isSolved) {
    return;
  }

  if (selectedIndex === null) {
    selectedIndex = index;
    renderBoard();
    return;
  }

  if (selectedIndex === index) {
    selectedIndex = null;
    renderBoard();
    return;
  }

  const firstPiece = board.children[selectedIndex];
  const secondPiece = board.children[index];

  if (firstPiece && secondPiece) {
    firstPiece.animate(
      [
        { transform: 'translate(0, 0) scale(1)', filter: 'brightness(1)' },
        { transform: 'translate(-6px, -2px) scale(1.08)', filter: 'brightness(1.15)' },
        { transform: 'translate(0, 0) scale(1)', filter: 'brightness(1)' }
      ],
      { duration: 260, easing: 'ease-out' }
    );

    secondPiece.animate(
      [
        { transform: 'translate(0, 0) scale(1)', filter: 'brightness(1)' },
        { transform: 'translate(6px, 2px) scale(1.08)', filter: 'brightness(1.15)' },
        { transform: 'translate(0, 0) scale(1)', filter: 'brightness(1)' }
      ],
      { duration: 260, easing: 'ease-out' }
    );
  }

  const temp = tiles[selectedIndex];
  tiles[selectedIndex] = tiles[index];
  tiles[index] = temp;
  selectedIndex = null;
  moves += 1;
  playSwapSound();

  isSolved = isBoardSolved();
  if (isSolved) {
    playWinSound();
  }
  renderBoard();
}

function shuffleTiles() {
  const shuffled = buildSolvedTiles();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  tiles = shuffled;
  selectedIndex = null;
  moves = 0;
  isSolved = false;
  renderBoard();
}

function resetGame() {
  tiles = buildSolvedTiles();
  selectedIndex = null;
  moves = 0;
  isSolved = false;
  renderBoard();
}

shuffleBtn.addEventListener('click', shuffleTiles);
resetBtn.addEventListener('click', resetGame);
musicToggleBtn.addEventListener('click', toggleMusic);
applyMusicBtn.addEventListener('click', applyMusicFromInput);
effectToggleBtn.addEventListener('click', toggleEffects);
effectVolumeSlider.addEventListener('input', handleEffectVolumeInput);

updateEffectVolumeLabel();
resetGame();

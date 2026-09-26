/**
 * Precision Sprite Renderer Engine for Campfire Poker
 * Pre-crops all 52 cards from assets/cards.jpg via offscreen canvas for 100% pixel perfection.
 */

const CARD_SHEET_WIDTH = 736;
const CARD_SHEET_HEIGHT = 303;
const CARD_COLS = 13;
const CARD_ROWS = 4;
const CARD_WIDTH = CARD_SHEET_WIDTH / CARD_COLS;  // ~56.615px
const CARD_HEIGHT = CARD_SHEET_HEIGHT / CARD_ROWS; // ~75.75px

const SUITS = ['clubs', 'spades', 'hearts', 'diamonds'];
const SUIT_ROWS = { 'clubs': 0, 'spades': 1, 'hearts': 2, 'diamonds': 3 };

function getRankCol(rank) {
  if (rank === 14) return 0; // Ace
  return rank - 1;           // 2 -> 1, ..., K -> 12
}

// Offscreen Pre-Cropping Cache for Cards
const cardDataCache = {};
let isCardsLoaded = false;

const cardSheetImg = new Image();
cardSheetImg.src = 'assets/cards.jpg';
cardSheetImg.onload = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  canvas.width = 56;
  canvas.height = 75;

  for (let r = 0; r < 4; r++) {
    const suit = SUITS[r];
    for (let c = 0; c < 13; c++) {
      const rank = (c === 0) ? 14 : c + 1;
      const sx = c * CARD_WIDTH;
      const sy = r * CARD_HEIGHT;

      ctx.clearRect(0, 0, 56, 75);
      // Precision crop from sheet onto 56x75 canvas
      ctx.drawImage(cardSheetImg, sx, sy, CARD_WIDTH, CARD_HEIGHT, 0, 0, 56, 75);

      const key = `${suit}_${rank}`;
      cardDataCache[key] = canvas.toDataURL('image/png');
    }
  }
  isCardsLoaded = true;
};

/**
 * Creates an HTML element for a playing card.
 */
function createCardElement(card, isHidden = false) {
  if (isHidden || !card) {
    const cardBackDiv = document.createElement('div');
    cardBackDiv.className = 'card-sprite card-back pixelated';
    cardBackDiv.setAttribute('data-card-key', 'back');
    return cardBackDiv;
  }

  const suit = card.suit || 'clubs';
  const rank = card.rank || 14;
  const key = `${suit}_${rank}`;

  if (cardDataCache[key]) {
    const imgElem = document.createElement('img');
    imgElem.className = 'card-sprite pixelated';
    imgElem.src = cardDataCache[key];
    imgElem.alt = `${rank} of ${suit}`;
    imgElem.setAttribute('data-card-key', key);
    return imgElem;
  }

  // Fallback if sheet still loading
  const cardDiv = document.createElement('div');
  cardDiv.className = 'card-sprite pixelated';
  cardDiv.setAttribute('data-card-key', key);
  const row = (typeof card.row === 'number') ? card.row : (SUIT_ROWS[suit] || 0);
  const col = (typeof card.col === 'number') ? card.col : getRankCol(rank);

  const posX = -(col * CARD_WIDTH);
  const posY = -(row * CARD_HEIGHT);

  cardDiv.style.backgroundImage = "url('assets/cards.jpg')";
  cardDiv.style.backgroundSize = `${CARD_SHEET_WIDTH}px ${CARD_SHEET_HEIGHT}px`;
  cardDiv.style.backgroundPosition = `${posX}px ${posY}px`;

  return cardDiv;
}

/**
 * Chip Sprite Rendering (assets/chips.jpg)
 */
const CHIP_OFFSETS = {
  'red': { x: 80, y: 190, size: 180 },      // $5
  'yellow': { x: 280, y: 190, size: 180 },   // $100
  'blue': { x: 480, y: 190, size: 180 },     // $50
  'green': { x: 180, y: 380, size: 180 },    // $25
  'black': { x: 380, y: 380, size: 180 }     // $500
};

function createChipElement(colorType = 'red', label = '') {
  const chipContainer = document.createElement('div');
  chipContainer.style.display = 'inline-flex';
  chipContainer.style.alignItems = 'center';
  chipContainer.style.gap = '4px';

  const chipDiv = document.createElement('div');
  chipDiv.className = 'chip-sprite pixelated';

  const config = CHIP_OFFSETS[colorType] || CHIP_OFFSETS['red'];
  const scale = 32 / config.size;
  const sheetWidth = 736 * scale;
  const sheetHeight = 736 * scale;

  chipDiv.style.width = '32px';
  chipDiv.style.height = '32px';
  chipDiv.style.backgroundImage = "url('assets/chips.jpg')";
  chipDiv.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;
  chipDiv.style.backgroundPosition = `-${config.x * scale}px -${config.y * scale}px`;

  chipContainer.appendChild(chipDiv);

  if (label) {
    const txt = document.createElement('span');
    txt.style.fontFamily = "var(--font-retro)";
    txt.style.fontSize = "16px";
    txt.style.color = "#FCD34D";
    txt.innerText = label;
    chipContainer.appendChild(txt);
  }

  return chipContainer;
}

function getChipBreakdown(amount) {
  const result = [];
  let rem = amount;

  const denominations = [
    { name: 'black', val: 500 },
    { name: 'yellow', val: 100 },
    { name: 'blue', val: 50 },
    { name: 'green', val: 25 },
    { name: 'red', val: 5 }
  ];

  for (const denom of denominations) {
    const count = Math.floor(rem / denom.val);
    if (count > 0) {
      result.push({ color: denom.name, count, val: denom.val });
      rem %= denom.val;
    }
  }
  return result;
}

window.SpriteRenderer = {
  createCardElement,
  createChipElement,
  getChipBreakdown
};

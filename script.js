const board = document.getElementById("board");
const imageInput = document.getElementById("imageInput");
const spreadBtn = document.getElementById("spreadBtn");

let topZ = 1;
let nextPileId = 1;
let active = null;

const cards = new Set();

imageInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await readAsDataUrl(file);
    createCard(dataUrl);
  }

  board.classList.toggle("has-cards", cards.size > 0);
  imageInput.value = "";
});

spreadBtn.addEventListener("click", () => spreadCards());

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createCard(src) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.pileId = "";
  card.innerHTML = `<img alt="Uploaded card" src="${src}">`;

  const pos = randomBoardPosition();
  card.style.left = `${pos.x}px`;
  card.style.top = `${pos.y}px`;
  card.style.transform = `rotate(${rand(-15, 15)}deg)`;
  card.style.zIndex = String(++topZ);

  card.addEventListener("pointerdown", onPointerDown);
  board.appendChild(card);
  cards.add(card);
}

function onPointerDown(event) {
  const card = event.currentTarget;
  const boardRect = board.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();

  active = {
    card,
    pointerId: event.pointerId,
    offsetX: event.clientX - cardRect.left,
    offsetY: event.clientY - cardRect.top,
    boardRect,
  };

  card.setPointerCapture(event.pointerId);
  card.style.zIndex = String(++topZ);
  card.classList.add("dragging");

  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event) {
  if (!active || event.pointerId !== active.pointerId) return;
  const { card, offsetX, offsetY, boardRect } = active;

  const x = clamp(
    event.clientX - boardRect.left - offsetX,
    -40,
    board.clientWidth - card.offsetWidth + 40,
  );
  const y = clamp(
    event.clientY - boardRect.top - offsetY,
    -40,
    board.clientHeight - card.offsetHeight + 40,
  );

  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}

function onPointerUp(event) {
  if (!active || event.pointerId !== active.pointerId) return;
  const { card } = active;

  card.releasePointerCapture(event.pointerId);
  card.classList.remove("dragging");
  card.style.transform = `rotate(${rand(-7, 7)}deg)`;
  snapToPileIfOverlapping(card);

  card.removeEventListener("pointermove", onPointerMove);
  card.removeEventListener("pointerup", onPointerUp);
  card.removeEventListener("pointercancel", onPointerUp);
  active = null;
}

function snapToPileIfOverlapping(card) {
  const cardRect = card.getBoundingClientRect();
  let bestTarget = null;
  let bestArea = 0;

  for (const candidate of cards) {
    if (candidate === card) continue;
    const overlap = overlapArea(cardRect, candidate.getBoundingClientRect());
    if (overlap > bestArea) {
      bestArea = overlap;
      bestTarget = candidate;
    }
  }

  if (!bestTarget || bestArea < 1400) return;

  const targetRect = bestTarget.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const targetX =
    targetRect.left - boardRect.left + (bestTarget.offsetWidth - card.offsetWidth) / 2;
  const targetY =
    targetRect.top - boardRect.top + (bestTarget.offsetHeight - card.offsetHeight) / 2;
  const pileId = mergePiles(card, bestTarget);
  const pileSize = getPileCards(pileId).length;

  card.style.left = `${targetX + rand(-10, 10)}px`;
  card.style.top = `${targetY + rand(-10, 10)}px`;
  card.style.transform = `rotate(${rand(-8, 8)}deg)`;
  card.style.zIndex = String(topZ + pileSize);
}

function mergePiles(card, target) {
  const cardPile = card.dataset.pileId || "";
  const targetPile = target.dataset.pileId || "";

  if (!cardPile && !targetPile) {
    const pileId = String(nextPileId++);
    card.dataset.pileId = pileId;
    target.dataset.pileId = pileId;
    return pileId;
  }

  if (cardPile && !targetPile) {
    target.dataset.pileId = cardPile;
    return cardPile;
  }

  if (!cardPile && targetPile) {
    card.dataset.pileId = targetPile;
    return targetPile;
  }

  if (cardPile === targetPile) return cardPile;

  for (const c of cards) {
    if (c.dataset.pileId === cardPile) c.dataset.pileId = targetPile;
  }
  return targetPile;
}

function getPileCards(pileId) {
  const pileCards = [];
  for (const card of cards) {
    if (card.dataset.pileId === pileId) pileCards.push(card);
  }
  return pileCards;
}

function spreadCards() {
  let i = 0;
  for (const card of cards) {
    const cols = Math.max(1, Math.floor(board.clientWidth / 200));
    const row = Math.floor(i / cols);
    const col = i % cols;

    const baseX = 30 + col * 190;
    const baseY = 30 + row * 235;
    card.style.left = `${baseX + rand(-20, 20)}px`;
    card.style.top = `${baseY + rand(-20, 20)}px`;
    card.style.transform = `rotate(${rand(-18, 18)}deg)`;
    card.dataset.pileId = "";
    card.style.zIndex = String(++topZ);
    i++;
  }
}

function randomBoardPosition() {
  return {
    x: rand(20, Math.max(20, board.clientWidth - 190)),
    y: rand(20, Math.max(20, board.clientHeight - 250)),
  };
}

function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const board = document.getElementById("board");
const imageInput = document.getElementById("imageInput");

const HOLD_TO_STACK_MS = 1000;

let nextPileId = 1;
let nextImageId = 1;
let dragState = null;

const piles = [];

imageInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await readAsDataUrl(file);
    piles.push({
      id: String(nextPileId++),
      images: [{ id: String(nextImageId++), src: dataUrl }],
    });
  }

  imageInput.value = "";
  renderBoard();
});

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderBoard() {
  board.innerHTML = "";

  for (const pile of piles) {
    const tile = document.createElement("section");
    tile.className = "tile";
    tile.dataset.pileId = pile.id;
    const card = document.createElement("article");
    card.className = "card top-card";
    card.innerHTML = makeBentoMarkup(pile.images);
    card.addEventListener("pointerdown", onPointerDown);
    tile.appendChild(card);

    if (pile.images.length > 1) {
      const count = document.createElement("span");
      count.className = "stack-count";
      count.textContent = String(pile.images.length);
      tile.appendChild(count);
    }

    board.appendChild(tile);
  }

  board.classList.toggle("has-cards", piles.length > 0);
}

function makeBentoMarkup(images) {
  const previewImages = images.slice(-4).reverse();
  const count = Math.max(1, Math.min(4, previewImages.length));
  const thumbs = previewImages
    .map((image) => `<img alt="Uploaded card preview" src="${image.src}">`)
    .join("");
  return `<div class="bento bento-${count}">${thumbs}</div>`;
}

function onPointerDown(event) {
  if (dragState) return;

  const sourceCard = event.currentTarget;
  const sourceTile = sourceCard.closest(".tile");
  if (!sourceTile) return;

  const sourcePileId = sourceTile.dataset.pileId;
  const sourcePile = findPile(sourcePileId);
  if (!sourcePile || sourcePile.images.length === 0) return;

  const rect = sourceCard.getBoundingClientRect();
  const ghost = sourceCard.cloneNode(true);
  ghost.classList.remove("top-card");
  ghost.classList.add("drag-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  document.body.appendChild(ghost);

  sourceCard.classList.add("source-hidden");
  sourceCard.setPointerCapture(event.pointerId);

  dragState = {
    pointerId: event.pointerId,
    sourcePileId,
    sourceCard,
    ghost,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    hoverPileId: null,
    holdTimer: null,
  };

  sourceCard.addEventListener("pointermove", onPointerMove);
  sourceCard.addEventListener("pointerup", onPointerUp);
  sourceCard.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  dragState.ghost.style.left = `${event.clientX - dragState.offsetX}px`;
  dragState.ghost.style.top = `${event.clientY - dragState.offsetY}px`;

  const targetTile = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tile");
  const targetPileId = targetTile ? targetTile.dataset.pileId : null;
  const nextHover =
    targetPileId && targetPileId !== dragState.sourcePileId ? targetPileId : null;

  setHoverTarget(nextHover);
}

function onPointerUp(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  cleanupDrag();
}

function setHoverTarget(pileId) {
  if (!dragState || pileId === dragState.hoverPileId) return;

  clearHoverTarget();

  if (!pileId) return;

  dragState.hoverPileId = pileId;
  const tile = board.querySelector(`.tile[data-pile-id="${pileId}"]`);
  if (!tile) return;

  tile.classList.add("hold-target");
  dragState.holdTimer = setTimeout(() => stackIntoTarget(pileId), HOLD_TO_STACK_MS);
}

function clearHoverTarget() {
  if (!dragState) return;

  if (dragState.holdTimer) {
    clearTimeout(dragState.holdTimer);
    dragState.holdTimer = null;
  }

  if (dragState.hoverPileId) {
    const tile = board.querySelector(`.tile[data-pile-id="${dragState.hoverPileId}"]`);
    if (tile) tile.classList.remove("hold-target");
  }

  dragState.hoverPileId = null;
}

function stackIntoTarget(targetPileId) {
  if (!dragState) return;

  const sourcePile = findPile(dragState.sourcePileId);
  const targetPile = findPile(targetPileId);
  if (!sourcePile || !targetPile || sourcePile.id === targetPile.id) {
    cleanupDrag();
    return;
  }

  const movedImage = sourcePile.images.pop();
  if (!movedImage) {
    cleanupDrag();
    return;
  }

  targetPile.images.push(movedImage);

  if (sourcePile.images.length === 0) {
    const sourceIndex = piles.findIndex((pile) => pile.id === sourcePile.id);
    if (sourceIndex >= 0) piles.splice(sourceIndex, 1);
  }

  cleanupDrag();
  renderBoard();
}

function cleanupDrag() {
  if (!dragState) return;

  clearHoverTarget();

  const { sourceCard, pointerId, ghost } = dragState;
  sourceCard.classList.remove("source-hidden");
  sourceCard.removeEventListener("pointermove", onPointerMove);
  sourceCard.removeEventListener("pointerup", onPointerUp);
  sourceCard.removeEventListener("pointercancel", onPointerUp);

  if (sourceCard.hasPointerCapture(pointerId)) {
    sourceCard.releasePointerCapture(pointerId);
  }

  if (ghost.isConnected) ghost.remove();
  dragState = null;
}

function findPile(pileId) {
  return piles.find((pile) => pile.id === pileId);
}

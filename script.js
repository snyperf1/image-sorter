const board = document.getElementById("board");
const imageInput = document.getElementById("imageInput");

let topZ = 1;
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
  card.innerHTML = `<img alt="Uploaded card" src="${src}">`;

  card.addEventListener("pointerdown", onPointerDown);
  board.appendChild(card);
  cards.add(card);
}

function onPointerDown(event) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();

  active = {
    card,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
  };

  card.setPointerCapture(event.pointerId);
  card.style.position = "fixed";
  card.style.zIndex = String(++topZ);
  card.classList.add("dragging");

  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event) {
  if (!active || event.pointerId !== active.pointerId) return;
  const { card, offsetX, offsetY } = active;

  card.style.left = `${event.clientX - offsetX}px`;
  card.style.top = `${event.clientY - offsetY}px`;
}

function onPointerUp(event) {
  if (!active || event.pointerId !== active.pointerId) return;
  const { card } = active;

  card.releasePointerCapture(event.pointerId);
  card.classList.remove("dragging");
  card.style.position = "";
  card.style.left = "";
  card.style.top = "";
  card.style.zIndex = "";

  active = null;
}

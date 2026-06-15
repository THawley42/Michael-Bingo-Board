const DEFAULT_TITLE = "Meeting Bingo";
const DEFAULT_ITEMS = [
  "Can everyone see my screen?",
  "Let's take this offline",
  "Sorry, I was on mute",
  "Can you repeat that?",
  "Let's circle back",
  "Per my last email",
  "We're almost out of time",
  "Someone's dog barks",
  "Awkward silence",
  "Internet connection issue",
  "Let's table this for now",
  "Synergy",
  "Low-hanging fruit",
  "Touch base",
  "Move the needle",
  "Deep dive",
  "Bandwidth",
  "Action items",
  "Quick question",
  "Going forward",
  "At the end of the day",
  "Think outside the box",
  "Game changer",
  "Drill down",
];

const FREE_SPACE = "FREE";
const CONFIG_KEY = "bingo-config";
const BOARD_KEY = "bingo-board";

const titleEl = document.getElementById("board-title");
const boardEl = document.getElementById("board");
const bannerEl = document.getElementById("bingo-banner");
const editorEl = document.getElementById("editor");
const titleInput = document.getElementById("title-input");
const itemsInput = document.getElementById("items-input");

let config = loadConfig();
let board = loadBoard(config);

render();

document.getElementById("new-card-btn").addEventListener("click", () => {
  board = makeBoard(config.items);
  saveBoard(board);
  render();
});

document.getElementById("reset-marks-btn").addEventListener("click", () => {
  board.marked = board.marked.map((m, i) => board.cells[i] === FREE_SPACE);
  saveBoard(board);
  render();
});

document.getElementById("edit-btn").addEventListener("click", () => {
  titleInput.value = config.title;
  itemsInput.value = config.items.join("\n");
  editorEl.classList.remove("hidden");
});

document.getElementById("cancel-edit-btn").addEventListener("click", () => {
  editorEl.classList.add("hidden");
});

document.getElementById("save-items-btn").addEventListener("click", () => {
  const newItems = itemsInput.value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (newItems.length < 24) {
    alert(`Need at least 24 items (you have ${newItems.length}).`);
    return;
  }

  config = {
    title: titleInput.value.trim() || DEFAULT_TITLE,
    items: newItems,
  };
  saveConfig(config);

  board = makeBoard(config.items);
  saveBoard(board);

  editorEl.classList.add("hidden");
  render();
});

document.getElementById("share-btn").addEventListener("click", async () => {
  const encoded = encodeConfig(config);
  const url = `${location.origin}${location.pathname}?d=${encoded}`;

  try {
    await navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard!");
  } catch (err) {
    prompt("Copy this link to share:", url);
  }
});

boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;

  const index = Number(cell.dataset.index);
  if (board.cells[index] === FREE_SPACE) return;

  board.marked[index] = !board.marked[index];
  saveBoard(board);
  render();
});

function render() {
  titleEl.textContent = config.title;

  boardEl.innerHTML = "";
  board.cells.forEach((text, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.textContent = text;

    if (text === FREE_SPACE) cell.classList.add("free");
    if (board.marked[i]) cell.classList.add("marked");

    boardEl.appendChild(cell);
  });

  bannerEl.classList.toggle("hidden", !hasBingo(board.marked));
}

function makeBoard(items) {
  const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 24);
  const cells = [...shuffled.slice(0, 12), FREE_SPACE, ...shuffled.slice(12)];
  const marked = cells.map((c) => c === FREE_SPACE);
  return { cells, marked };
}

function hasBingo(marked) {
  const lines = [];

  // rows and columns
  for (let i = 0; i < 5; i++) {
    lines.push([0, 1, 2, 3, 4].map((j) => i * 5 + j)); // row
    lines.push([0, 1, 2, 3, 4].map((j) => j * 5 + i)); // column
  }

  // diagonals
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);

  return lines.some((line) => line.every((idx) => marked[idx]));
}

function loadConfig() {
  const params = new URLSearchParams(location.search);
  const shared = params.get("d");

  if (shared) {
    const decoded = decodeConfig(shared);
    if (decoded) {
      saveConfig(decoded);
      localStorage.removeItem(BOARD_KEY);
      return decoded;
    }
  }

  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fall through to default
    }
  }

  return { title: DEFAULT_TITLE, items: DEFAULT_ITEMS };
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function loadBoard(cfg) {
  const stored = localStorage.getItem(BOARD_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.cells && parsed.cells.length === 25) return parsed;
    } catch {
      // fall through to new board
    }
  }
  const fresh = makeBoard(cfg.items);
  saveBoard(fresh);
  return fresh;
}

function saveBoard(b) {
  localStorage.setItem(BOARD_KEY, JSON.stringify(b));
}

function encodeConfig(cfg) {
  return btoa(encodeURIComponent(JSON.stringify(cfg)));
}

function decodeConfig(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

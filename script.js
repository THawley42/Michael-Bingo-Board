const DEFAULT_TITLE = "Michael Bingo";
const DEFAULT_ITEMS = [
  "Spills drink",
  "Shouts out the bitches",
  "Buys a beer he hates",
  "Goes silent",
  "Insinuates his drink is his dinner",
  "Starts a conversation with a stranger",
  "Does the tonge wagging thing",
  "Askes someone else to buy him a drink",
  "Comments on the music",
  "Says something insane, then tries to dap someone up",
  "Complains about work",
  "* Loses his phone",
  "* Takes his shirt off",
  "* Orders a round of shots nobody asked for",
  "* Insists on paying for people's drinks",
  "* Tells the same story for the second time",
  "Tries to convince everyone to go somewhere else",
  "* Starts dancing before anyone else does",
  "* Gets way too competitive at a bar game",
  "* Falls off a barstool",
  "* Hugs someone he just met",
  "* Starts singing along to a song he doesn't know the words to",
  "* Loses track of how many drinks he's had",
  "* Tries to order food after the kitchen's closed",
];

const FREE_SPACE = "Drinks";
const CONFIG_KEY = "bingo-config";
const BOARD_KEY = "bingo-board";
const PASSWORD_KEY = "bingo-password";
const API_BASE = "https://bingo-board-backend.michealbingo.workers.dev";

const titleEl = document.getElementById("board-title");
const boardEl = document.getElementById("board");
const bannerEl = document.getElementById("bingo-banner");
const spillCountEl = document.getElementById("spill-count");
const editorEl = document.getElementById("editor");
const itemsInput = document.getElementById("items-input");

let config = loadConfig();
let board = loadBoard(config);
let spillCount = 0;

render();
renderSpillCount();
loadSharedState();

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
  itemsInput.value = config.items.join("\n");
  editorEl.classList.remove("hidden");
});

document.getElementById("cancel-edit-btn").addEventListener("click", () => {
  editorEl.classList.add("hidden");
});

document.getElementById("save-items-btn").addEventListener("click", async () => {
  const newItems = itemsInput.value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (newItems.length < 24) {
    alert(`Need at least 24 items (you have ${newItems.length}).`);
    return;
  }

  const result = await callApi("/items", { items: newItems });
  if (!result) return;

  config.items = result.items;
  saveConfig(config);
  editorEl.classList.add("hidden");
});

document.getElementById("spill-plus").addEventListener("click", () => adjustSpill(1));
document.getElementById("spill-minus").addEventListener("click", () => adjustSpill(-1));

document.getElementById("share-btn").addEventListener("click", async () => {
  const encoded = encodeConfig(config, board);
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
      const cfg = { title: decoded.title, items: decoded.items };
      saveConfig(cfg);

      if (decoded.cells?.length === 25 && decoded.marked?.length === 25) {
        saveBoard({ cells: decoded.cells, marked: decoded.marked });
      } else {
        localStorage.removeItem(BOARD_KEY);
      }

      return cfg;
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

function renderSpillCount() {
  spillCountEl.textContent = `Spills: ${spillCount}`;
}

async function loadSharedState() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) return;

    const state = await res.json();
    if (Array.isArray(state.items) && state.items.length >= 24) {
      config.items = state.items;
      saveConfig(config);
    }
    spillCount = state.spillCount || 0;
    renderSpillCount();
  } catch {
    // offline or worker unreachable - keep local fallback
  }
}

async function adjustSpill(delta) {
  const result = await callApi("/spill", { delta });
  if (!result) return;

  spillCount = result.spillCount;
  renderSpillCount();
}

async function callApi(path, body) {
  let password = localStorage.getItem(PASSWORD_KEY);
  if (!password) {
    password = prompt("Enter the shared password:");
    if (password === null) return null;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, password }),
    });

    if (res.status === 401) {
      localStorage.removeItem(PASSWORD_KEY);
      alert("Incorrect password.");
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Something went wrong.");
      return null;
    }

    localStorage.setItem(PASSWORD_KEY, password);
    return await res.json();
  } catch {
    alert("Could not reach the server. Try again later.");
    return null;
  }
}

function encodeConfig(cfg, brd) {
  return btoa(encodeURIComponent(JSON.stringify({ ...cfg, cells: brd.cells, marked: brd.marked })));
}

function decodeConfig(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

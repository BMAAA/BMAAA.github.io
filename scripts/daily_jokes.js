/*
  Placeholders in daily_jokes.json (local computer time):
  [timeNow]              — текущее время, HH:MM
  [yearsNow]             — текущий год
  [dayToday]             — сегодняшний день недели
  [dayTomorrow]          — завтрашний день недели
  [yearsSince:2006]      — сколько лет прошло с указанного года
  [timeSince:13,24]      — сколько осталось до HH:MM (в пределах 24 часов);
                           часы 1–24, минуты 0–60
*/
const DAILY_JOKES_FILE = () =>
  window.PplBase ? window.PplBase.url("/data/daily_jokes.json") : "/data/daily_jokes.json";

let jokeRequestId = 0;
let jokesCache = null;

function getDayOfYear(date = new Date()) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86400000);
}

function fillJokeTemplate(template) {
  if (window.PplPlaceholders?.applyPlaceholders) {
    return window.PplPlaceholders.applyPlaceholders(template);
  }
  return String(template);
}

function pickDailyJoke(jokes) {
  if (!Array.isArray(jokes) || jokes.length === 0) return "";
  return fillJokeTemplate(jokes[getDayOfYear() % jokes.length]);
}

function prepareJokeMarquee(marquee, attempt = 0) {
  if (!marquee || marquee.dataset.ready === "1") return;
  const track = marquee.querySelector(".sidebar-joke-track");
  const group = marquee.querySelector(".sidebar-joke-group");
  const sourceHint = group?.querySelector(".sidebar-joke-text");
  if (!track || !group || !sourceHint) return;

  const text = sourceHint.textContent || "";
  if (!text) return;

  const segmentWidth = Math.max(sourceHint.scrollWidth, sourceHint.offsetWidth);
  const containerWidth = marquee.clientWidth;
  if (segmentWidth <= 0 || containerWidth <= 0) {
    if (attempt < 5) {
      requestAnimationFrame(() => prepareJokeMarquee(marquee, attempt + 1));
    }
    return;
  }

  group.replaceChildren(sourceHint);
  track.querySelectorAll(".sidebar-joke-group").forEach((node, index) => {
    if (index > 0) node.remove();
  });

  const copiesNeeded = Math.min(6, Math.max(2, Math.ceil((containerWidth * 2) / segmentWidth) + 1));
  for (let index = 1; index < copiesNeeded; index += 1) {
    const clone = document.createElement("span");
    clone.className = "sidebar-joke-text";
    clone.textContent = text;
    clone.setAttribute("aria-hidden", "true");
    group.appendChild(clone);
  }

  const loop = group.cloneNode(true);
  loop.setAttribute("aria-hidden", "true");
  track.appendChild(loop);

  const distance = group.scrollWidth;
  const pxPerSecond = 36;
  track.style.animationDuration = `${Math.max(12, distance / pxPerSecond)}s`;
  marquee.dataset.ready = "1";
}

function renderJokeMarquee(container, text) {
  container.replaceChildren();
  container.className = "sidebar-joke";
  container.dataset.ready = "0";
  container.setAttribute("role", "note");
  const track = document.createElement("div");
  track.className = "sidebar-joke-track";
  const group = document.createElement("div");
  group.className = "sidebar-joke-group";
  const line = document.createElement("span");
  line.className = "sidebar-joke-text";
  line.textContent = text;
  group.appendChild(line);
  track.appendChild(group);
  container.appendChild(track);
  requestAnimationFrame(() => {
    prepareJokeMarquee(container);
  });
}

async function loadDailyJokes() {
  if (jokesCache) return jokesCache;
  const response = await fetch(DAILY_JOKES_FILE());
  if (!response.ok) {
    throw new Error("Не удалось загрузить шутки.");
  }
  jokesCache = await response.json();
  return jokesCache;
}

async function setTitleJoke() {
  const title = document.getElementById("title");
  if (!title) return;
  const requestId = ++jokeRequestId;
  try {
    const jokes = await loadDailyJokes();
    if (requestId !== jokeRequestId) return;
    const currentTitle = document.getElementById("title");
    if (!currentTitle || currentTitle !== title) return;
    const joke = pickDailyJoke(jokes);
    if (!joke) return;
    renderJokeMarquee(currentTitle, joke);
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("ppl:layout-ready", setTitleJoke);
if (document.getElementById("title")) {
  setTitleJoke();
}

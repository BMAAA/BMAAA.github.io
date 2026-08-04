/* =========================================================
   НАСТРОЙКИ ФАЙЛОВ
========================================================= */

function asset(path) {
  return window.PplBase ? window.PplBase.url(path) : path;
}

const ITEMS_FILE = "/data/items.json";
const ALIASES_FILE = "/data/item_aliases.json";
const BADSELL_FILTER_FILE = "/data/badsell_filter.json";
const HISTORY_KEY = "ppl_item_history";
const HISTORY_LIMIT = 8;
const BADSELL_FILTER_KEY = "ppl_badsell_filter";

/* =========================================================
   ДАННЫЕ
========================================================= */

let items = [];
let activeCategoryFilter = "all";
let salesFilterEnabled = localStorage.getItem(BADSELL_FILTER_KEY) === "1";
const itemAliases = new Map();
const badsellFilterIds = new Set();

/* =========================================================
   ПОРЯДОК КАТЕГОРИЙ
========================================================= */

const CATEGORY_ORDER = [
  "cur",
  "forb",
  "gal",
  "boo",
  "food",
  "loot",
  "val",
  "arm",
  "var",
  "dyp",
  "blo",
];

/* =========================================================
   АТЛАСЫ
========================================================= */

const ATLAS_DATA_FILE = "/data/atlases/items_atlas.json";
const ATLAS_DIRECTORY = "/assets/atlases/";
const HEAVY_ATLAS_CATEGORIES = ["blo", "var", "dyp"];
const ATLAS_APPLY_CHUNK = 48;
let atlasData = null;
const atlasDecodeCache = new Map();

async function loadAtlasData() {
  const response = await fetch(asset(ATLAS_DATA_FILE));
  if (!response.ok) {
    throw new Error("Не удалось загрузить данные атласов.");
  }
  atlasData = await response.json();
}

function getCategoryAtlasUrl(categoryKey) {
  const categoryAtlas = atlasData?.categories?.[categoryKey];
  if (!categoryAtlas?.file) return null;
  return asset(ATLAS_DIRECTORY + categoryAtlas.file);
}

function decodeAtlas(url) {
  if (!url) return Promise.resolve();
  const cached = atlasDecodeCache.get(url);
  if (cached) return cached;
  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    const finish = () => resolve(url);
    if (image.decode) {
      image.decode().then(finish).catch(finish);
      return;
    }
    if (image.complete) {
      finish();
      return;
    }
    image.onload = finish;
    image.onerror = finish;
  });
  atlasDecodeCache.set(url, promise);
  return promise;
}

function preloadAtlasUrl(url) {
  if (!url || typeof document === "undefined") return;
  if (document.head.querySelector(`link[data-atlas-preload="${url}"]`)) {
    decodeAtlas(url);
    return;
  }
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.dataset.atlasPreload = url;
  document.head.appendChild(link);
  decodeAtlas(url);
}

function preloadHeavyAtlases() {
  HEAVY_ATLAS_CATEGORIES.forEach((key) => {
    preloadAtlasUrl(getCategoryAtlasUrl(key));
  });
}

function preloadAtlasesIdle() {
  if (!atlasData?.categories) return;
  const heavy = new Set(HEAVY_ATLAS_CATEGORIES.map((key) => getCategoryAtlasUrl(key)));
  const urls = [
    ...new Set(
      Object.keys(atlasData.categories)
        .map((key) => getCategoryAtlasUrl(key))
        .filter((url) => url && !heavy.has(url)),
    ),
  ];
  const pump = (deadline) => {
    while (urls.length && (!deadline || deadline.timeRemaining() > 6)) {
      decodeAtlas(urls.shift());
    }
    if (!urls.length) return;
    if ("requestIdleCallback" in window) {
      requestIdleCallback(pump, { timeout: 2000 });
    } else {
      setTimeout(() => pump(), 40);
    }
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(pump, { timeout: 900 });
  } else {
    setTimeout(() => pump(), 120);
  }
}

function estimateSectionIntrinsicSize(itemCount, categoryKey) {
  const marqueeExtra = categoryKey === "cur" || categoryKey === "forb" ? 34 : 0;
  const columns = 12;
  const rows = Math.max(1, Math.ceil(itemCount / columns));
  const titleExtra = categoryKey === "cur" || categoryKey === "forb" ? 20 : 0;
  return 44 + 16 + rows * 78 + marqueeExtra + titleExtra;
}

function createCategoryMarquee(text) {
  const marquee = document.createElement("div");
  marquee.className = "category-marquee";
  marquee.setAttribute("role", "note");
  const track = document.createElement("div");
  track.className = "category-marquee-track";
  const group = document.createElement("div");
  group.className = "category-marquee-group";
  const hint = document.createElement("span");
  hint.className = "category-hint";
  hint.textContent = text;
  group.appendChild(hint);
  track.appendChild(group);
  marquee.appendChild(track);
  return marquee;
}

function prepareCategoryMarquees(root = document) {
  root.querySelectorAll(".category-marquee").forEach((marquee) => {
    const track = marquee.querySelector(".category-marquee-track");
    const group = marquee.querySelector(".category-marquee-group");
    const sourceHint = group?.querySelector(".category-hint");
    if (!track || !group || !sourceHint || track.dataset.ready === "1") return;
    const text = sourceHint.textContent || "";
    const targetWidth = Math.max(marquee.clientWidth, 720);
    let guard = 0;
    while (group.scrollWidth < targetWidth + 48 && guard < 16) {
      const hint = document.createElement("span");
      hint.className = "category-hint";
      hint.textContent = text;
      hint.setAttribute("aria-hidden", "true");
      group.appendChild(hint);
      guard += 1;
    }
    const clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
    const distance = group.scrollWidth;
    const pxPerSecond = 42;
    track.style.animationDuration = `${Math.max(14, distance / pxPerSecond)}s`;
    track.dataset.ready = "1";
  });
}

function applyAtlasInChunks(section, url) {
  const images = section.querySelectorAll(".item-image");
  if (images.length <= ATLAS_APPLY_CHUNK) {
    section.style.setProperty("--item-atlas-image", `url("${url}")`);
    return;
  }
  let index = 0;
  const step = () => {
    const end = Math.min(index + ATLAS_APPLY_CHUNK, images.length);
    for (; index < end; index++) {
      images[index].style.setProperty("--item-atlas-image", `url("${url}")`);
    }
    if (index < images.length) {
      requestAnimationFrame(step);
    } else {
      section.style.setProperty("--item-atlas-image", `url("${url}")`);
    }
  };
  requestAnimationFrame(step);
}

/* =========================================================
   ПРЕОБРАЗОВАНИЕ КЛЮЧА ПРЕДМЕТА
========================================================= */

function getIndexItemName(itemName) {
  return itemName.toUpperCase();
}

/* =========================================================
   ИНДЕКСЫ ПРЕДМЕТОВ
========================================================= */

const ITEM_INDEX_LIST = main();
const ITEM_INDEX_MAP = new Map();
ITEM_INDEX_LIST.forEach((itemName, index) => {
  ITEM_INDEX_MAP.set(itemName.toUpperCase(), index);
});

/* =========================================================
   СОРТИРОВКА ПРЕДМЕТОВ ПО INDEXES.JS
========================================================= */

function sortItemsByIndex(categoryItems) {
  const sortedItems = [...categoryItems];
  sortedItems.forEach((item) => {
    const indexName = getIndexItemName(item.name);
    const exists = ITEM_INDEX_MAP.has(indexName);
    if (!exists) {
      logMissingIndexItem(item);
    }
  });
  sortedItems.sort((firstItem, secondItem) => {
    const firstName = getIndexItemName(firstItem.name);
    const secondName = getIndexItemName(secondItem.name);
    const firstIndex = ITEM_INDEX_MAP.get(firstName);
    const secondIndex = ITEM_INDEX_MAP.get(secondName);
    const firstExists = firstIndex !== undefined;
    const secondExists = secondIndex !== undefined;
    if (firstExists && secondExists) {
      return firstIndex - secondIndex;
    }
    if (firstExists && !secondExists) {
      return -1;
    }
    if (!firstExists && secondExists) {
      return 1;
    }
    return 0;
  });
  return sortedItems;
}

/* =========================================================
   ПРЕДМЕТЫ, ОТСУТСТВУЮЩИЕ В INDEXES.JS
========================================================= */

const missingIndexItems = new Set();
function logMissingIndexItem(item) {
  const indexName = getIndexItemName(item.name);
  if (missingIndexItems.has(indexName)) {
    return;
  }
  missingIndexItems.add(indexName);
  console.warn("[INDEXES] Предмет отсутствует в списке:", indexName);
}

/* =========================================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
========================================================= */

const categoriesContainer = document.getElementById("categoriesContainer");
const catalogue = document.getElementById("catalogue");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const floatingSearch = document.getElementById("floatingSearch");
const searchToggle = document.getElementById("searchToggle");
const itemCounter = document.getElementById("itemCounter");
const itemModal = document.getElementById("itemModal");
const categoryFilters = document.getElementById("categoryFilters");
const itemLookup = new Map();
let lastFocusedElement = null;
let modalFocusHandler = null;

function setFloatingSearchOpen(open) {
  if (!floatingSearch || !searchToggle) return;
  floatingSearch.classList.toggle("is-open", open);
  searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function openFloatingSearch() {
  if (!floatingSearch || !searchInput) return;
  setFloatingSearchOpen(true);
  const focusInput = () => {
    searchInput.focus({ preventScroll: true });
    if (typeof searchInput.select === "function") {
      searchInput.select();
    }
  };
  requestAnimationFrame(() => {
    focusInput();
    requestAnimationFrame(focusInput);
  });
}

function closeFloatingSearch({ clear = false, force = false } = {}) {
  if (clear && searchInput) {
    searchInput.value = "";
    searchItems();
  }
  if (searchInput && document.activeElement === searchInput) {
    searchInput.blur();
  }
  if (!force && searchInput && searchInput.value.trim() !== "") {
    setFloatingSearchOpen(true);
    return;
  }
  setFloatingSearchOpen(false);
}

function isFloatingSearchOpen() {
  return Boolean(
    floatingSearch &&
      (floatingSearch.classList.contains("is-open") || document.activeElement === searchInput)
  );
}

function toggleFloatingSearch() {
  if (isFloatingSearchOpen()) {
    closeFloatingSearch({ force: true });
    return;
  }
  openFloatingSearch();
}

function tr(key, vars) {
  const raw = window.PplI18n ? window.PplI18n.t(key) : key;
  if (!vars) return raw;
  return Object.keys(vars).reduce((text, name) => text.replace(`{${name}}`, vars[name]), raw);
}

function translate(key) {
  return tr(key);
}

function getCurrentLanguage() {
  return window.PplI18n ? window.PplI18n.currentLanguage : "ru_ru";
}

/* =========================================================
   ЗАГРУЗКА CSV
========================================================= */

async function loadItems() {
  const response = await fetch(asset(ITEMS_FILE));
  if (!response.ok) {
    throw new Error("Не удалось загрузить JSON");
  }
  return response.json();
}

async function loadItemAliases() {
  const response = await fetch(asset(ALIASES_FILE));
  if (!response.ok) {
    throw new Error("Не удалось загрузить алиасы предметов.");
  }
  const data = await response.json();
  itemAliases.clear();
  Object.entries(data || {}).forEach(([itemId, aliases]) => {
    if (!Array.isArray(aliases) || aliases.length === 0) return;
    itemAliases.set(
      itemId,
      aliases
        .filter((alias) => typeof alias === "string" && alias.trim())
        .map((alias) => alias.trim().toLowerCase()),
    );
  });
}

async function loadBadsellFilter() {
  const response = await fetch(asset(BADSELL_FILTER_FILE));
  if (!response.ok) {
    throw new Error("Не удалось загрузить фильтр продаж.");
  }
  const data = await response.json();
  badsellFilterIds.clear();
  (Array.isArray(data) ? data : []).forEach((entry) => {
    if (typeof entry !== "string" || !entry.trim()) return;
    const id = entry.trim().replace(/^minecraft:/i, "");
    if (id) badsellFilterIds.add(id);
  });
}

function isHiddenBySalesFilter(item) {
  return salesFilterEnabled && badsellFilterIds.has(item.name);
}

function syncSalesFilterToggle() {
  const toggle = document.getElementById("salesFilterToggle");
  if (!toggle) return;
  toggle.classList.toggle("active", salesFilterEnabled);
  toggle.setAttribute("aria-pressed", salesFilterEnabled ? "true" : "false");
  toggle.title = tr("sales_filter_tip");
  toggle.textContent = tr("sales_filter");
}

function prepareSalesFilterWarningMarquee(marquee) {
  if (!marquee || marquee.dataset.ready === "1") return;
  const track = marquee.querySelector(".sales-filter-warning-track");
  const group = marquee.querySelector(".sales-filter-warning-group");
  const source = group?.querySelector(".sales-filter-warning-text");
  if (!track || !group || !source) return;
  const text = source.textContent || "";
  if (!text) return;
  const segmentWidth = Math.max(source.scrollWidth, source.offsetWidth);
  const containerWidth = marquee.clientWidth;
  if (segmentWidth <= 0 || containerWidth <= 0) {
    requestAnimationFrame(() => prepareSalesFilterWarningMarquee(marquee));
    return;
  }
  group.replaceChildren(source);
  track.querySelectorAll(".sales-filter-warning-group").forEach((node, index) => {
    if (index > 0) node.remove();
  });
  const copiesNeeded = Math.min(6, Math.max(2, Math.ceil((containerWidth * 2) / segmentWidth) + 1));
  for (let index = 1; index < copiesNeeded; index += 1) {
    const clone = document.createElement("span");
    clone.className = "sales-filter-warning-text";
    clone.textContent = text;
    clone.setAttribute("aria-hidden", "true");
    group.appendChild(clone);
  }
  const loop = group.cloneNode(true);
  loop.setAttribute("aria-hidden", "true");
  track.appendChild(loop);
  const distance = group.scrollWidth;
  track.style.animationDuration = `${Math.max(16, distance / 38)}s`;
  marquee.dataset.ready = "1";
}

function renderSalesFilterWarning(marquee, text) {
  marquee.replaceChildren();
  marquee.dataset.ready = "0";
  const track = document.createElement("div");
  track.className = "sales-filter-warning-track";
  const group = document.createElement("div");
  group.className = "sales-filter-warning-group";
  const line = document.createElement("span");
  line.className = "sales-filter-warning-text";
  line.textContent = text;
  group.appendChild(line);
  track.appendChild(group);
  marquee.appendChild(track);
  requestAnimationFrame(() => prepareSalesFilterWarningMarquee(marquee));
}

function syncSalesFilterWarning() {
  const warning = document.getElementById("salesFilterWarning");
  if (!warning || !searchInput) return;
  const shouldShow = salesFilterEnabled && searchInput.value.trim() !== "";
  warning.hidden = !shouldShow;
  if (!shouldShow) return;
  const text = tr("sales_filter_warning");
  const current = warning.querySelector(".sales-filter-warning-text");
  if (!current || current.textContent !== text || warning.dataset.ready !== "1") {
    renderSalesFilterWarning(warning, text);
  }
}

function bindSalesFilterToggle() {
  const toggle = document.getElementById("salesFilterToggle");
  if (!toggle || toggle.dataset.bound === "1") return;
  toggle.dataset.bound = "1";
  toggle.addEventListener("click", () => {
    salesFilterEnabled = !salesFilterEnabled;
    localStorage.setItem(BADSELL_FILTER_KEY, salesFilterEnabled ? "1" : "0");
    syncSalesFilterToggle();
    searchItems();
  });
  syncSalesFilterToggle();
}

/* =========================================================
   ПАРСЕР CSV
   Поддерживает:
   name,image,category
   Также поддерживает значения в кавычках.
========================================================= */

function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = splitCSVLine(lines[0]);
  const result = [];
  for (let index = 1; index < lines.length; index++) {
    if (!lines[index].trim()) {
      continue;
    }
    const values = splitCSVLine(lines[index]);
    const item = {};
    headers.forEach((header, columnIndex) => {
      item[header.trim()] = values[columnIndex]?.trim() || "";
    });
    result.push(item);
  }
  return result;
}

/* =========================================================
   РАЗБОР ОДНОЙ СТРОКИ CSV
========================================================= */

function splitCSVLine(line) {
  const values = [];
  let currentValue = "";
  let insideQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }
    if (character === "," && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }
    currentValue += character;
  }
  values.push(currentValue);
  return values;
}

/* =========================================================
   ЗАГРУЗКА ПЕРЕВОДОВ
========================================================= */

/* =========================================================
   ПОЛУЧЕНИЕ ПЕРЕВОДА
   Если ключ отсутствует,
   возвращается сам ключ.
========================================================= */

/* =========================================================
   ГРУППИРОВКА ПО КАТЕГОРИЯМ
========================================================= */

function groupItems() {
  const categories = {};
  items.forEach((item) => {
    const category = item.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(item);
  });
  return categories;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, query) {
  if (!query) return text;
  const pattern = new RegExp(`(${escapeRegExp(query)})`, "ig");
  return text.replace(pattern, "<mark>$1</mark>");
}

function renderCategoryFilters(groupedItems) {
  if (!categoryFilters) return;
  const keys = CATEGORY_ORDER.filter((key) => groupedItems[key]).concat(
    Object.keys(groupedItems).filter((key) => !CATEGORY_ORDER.includes(key)),
  );
  categoryFilters.innerHTML = "";
  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `filter-chip${activeCategoryFilter === "all" ? " active" : ""}`;
  allButton.dataset.category = "all";
  allButton.textContent = tr("filter_all");
  categoryFilters.appendChild(allButton);
  keys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${activeCategoryFilter === key ? " active" : ""}`;
    button.dataset.category = key;
    button.textContent = translate(key);
    categoryFilters.appendChild(button);
  });
}

/* =========================================================
   СОЗДАНИЕ КАТАЛОГА
========================================================= */

function renderCatalogue() {
  const groupedItems = groupItems();
  const existingCategories = Object.keys(groupedItems);
  const orderedCategories = CATEGORY_ORDER.filter((category) => {
    return groupedItems[category] !== undefined;
  });
  const unspecifiedCategories = existingCategories.filter((category) => {
    return !CATEGORY_ORDER.includes(category);
  });
  unspecifiedCategories.sort((firstCategory, secondCategory) => {
    return translate(firstCategory).localeCompare(translate(secondCategory), getCurrentLanguage());
  });
  const finalCategoryOrder = [...orderedCategories, ...unspecifiedCategories];
  renderCategoryFilters(groupedItems);
  categoriesContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  finalCategoryOrder.forEach((categoryKey, order) => {
    const categoryItems = groupedItems[categoryKey];
    const isPriority = categoryKey === "cur" || categoryKey === "forb";
    const section = document.createElement("section");
    section.className = "category-section";
    if (isPriority) section.classList.add("category-section--priority");
    section.dataset.order = order;
    section.dataset.category = categoryKey;
    section.id = `category-${categoryKey}`;
    section.style.containIntrinsicSize = `auto ${estimateSectionIntrinsicSize(categoryItems.length, categoryKey)}px`;
    const title = document.createElement("h3");
    title.className = "category-title";
    const titleText = document.createElement("span");
    titleText.className = "category-title-text";
    titleText.textContent = translate(categoryKey);
    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = String(categoryItems.length);
    if (isPriority) {
      const role = document.createElement("span");
      role.className = "category-role";
      role.textContent = translate(`${categoryKey}_role`);
      title.append(role, titleText, count);
    } else {
      title.append(titleText, count);
    }
    const body = document.createElement("div");
    body.className = "category-body";
    const grid = document.createElement("div");
    grid.className = "items-grid";
    const cardsFragment = document.createDocumentFragment();
    const sortedCategoryItems = sortItemsByIndex(categoryItems);
    sortedCategoryItems.forEach((item, itemOrder) => {
      const card = createItemCard(item);
      card.dataset.order = itemOrder;
      cardsFragment.appendChild(card);
    });
    grid.appendChild(cardsFragment);
    body.appendChild(grid);
    if (isPriority) {
      section.append(title, createCategoryMarquee(translate(`${categoryKey}_hint`)), body);
    } else {
      section.append(title, body);
    }
    fragment.appendChild(section);
  });
  categoriesContainer.appendChild(fragment);
  requestAnimationFrame(() => {
    prepareCategoryMarquees(categoriesContainer);
  });
  updateCounter();
  observeCategoryAtlases();
  preloadHeavyAtlases();
  preloadAtlasesIdle();
  searchItems();
}

/* =========================================================
   СОЗДАНИЕ ИКОНКИ ИЗ АТЛАСА
========================================================= */

function createItemCard(item) {
  const card = document.createElement("button");
  card.className = "item-card";
  card.type = "button";
  const translatedName = translate(item.name);
  const translatedCategory = translate(item.category);
  card.dataset.name = translatedName.toLowerCase();
  card.dataset.id = item.name.toLowerCase();
  card.dataset.category = translatedCategory.toLowerCase();
  card.dataset.categoryKey = item.category;
  card.title = translatedName;
  card.setAttribute("aria-label", translatedName);
  const spriteData = atlasData?.items?.[item.name];
  if (!spriteData) {
    console.warn("Предмет отсутствует в атласе:", item.name);
    card.classList.add("atlas-missing");
    return card;
  }
  const cellSize = atlasData.cell_size;
  const displaySize = 56;
  const spriteBleedGuard = 0.5;
  const scale = (displaySize + spriteBleedGuard * 2) / cellSize;
  const categoryAtlas = atlasData.categories?.[item.category];
  if (!categoryAtlas) {
    console.warn("Категория отсутствует в данных атласа:", item.category);
    return card;
  }
  card.dataset.itemKey = item.name;
  card.dataset.index = ITEM_INDEX_MAP.get(item.name.toUpperCase()) ?? 999999;
  const imageContainer = document.createElement("div");
  imageContainer.className = "item-image";
  imageContainer.style.width = `${displaySize}px`;
  imageContainer.style.height = `${displaySize}px`;
  imageContainer.style.setProperty(
    "--item-atlas-size",
    `${categoryAtlas.width * scale}px ${categoryAtlas.height * scale}px`,
  );
  imageContainer.style.setProperty(
    "--item-atlas-position",
    `-${spriteData.x * scale + spriteBleedGuard}px -${spriteData.y * scale + spriteBleedGuard}px`,
  );
  const label = document.createElement("span");
  label.className = "item-label";
  label.hidden = true;
  card.append(imageContainer, label);
  return card;
}

function revealAtlas(section) {
  if (!section || section.dataset.atlasLoaded === "1" || section.dataset.atlasLoading === "1") return;
  const url = getCategoryAtlasUrl(section.dataset.category);
  if (!url) return;
  section.dataset.atlasLoading = "1";
  decodeAtlas(url).then((readyUrl) => {
    requestAnimationFrame(() => {
      applyAtlasInChunks(section, readyUrl);
      section.dataset.atlasLoaded = "1";
      delete section.dataset.atlasLoading;
    });
  });
}

function warmAtlas(section) {
  if (!section || section.dataset.atlasWarmed === "1") return;
  section.dataset.atlasWarmed = "1";
  const url = getCategoryAtlasUrl(section.dataset.category);
  if (url) decodeAtlas(url);
}

let atlasWarmObserver = null;
let atlasRevealObserver = null;
function observeCategoryAtlases() {
  if (atlasWarmObserver) atlasWarmObserver.disconnect();
  if (atlasRevealObserver) atlasRevealObserver.disconnect();

  atlasWarmObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        warmAtlas(entry.target);
        atlasWarmObserver.unobserve(entry.target);
      });
    },
    {
      root: catalogue,
      rootMargin: "1400px 0px",
      threshold: 0.01,
    },
  );

  atlasRevealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealAtlas(entry.target);
        atlasRevealObserver.unobserve(entry.target);
      });
    },
    {
      root: catalogue,
      rootMargin: "280px 0px",
      threshold: 0.01,
    },
  );

  categoriesContainer.querySelectorAll(".category-section").forEach((section) => {
    atlasWarmObserver.observe(section);
    atlasRevealObserver.observe(section);
  });
}

function itemMatchesQuery(item, query) {
  if (isHiddenBySalesFilter(item)) return false;
  if (!query) return true;
  const aliases = itemAliases.get(item.name);
  if (aliases?.some((alias) => alias.includes(query))) {
    return true;
  }
  const name = translate(item.name).toLowerCase();
  if (name.includes(query)) {
    return true;
  }
  const category = translate(item.category).toLowerCase();
  if (category.includes(query)) {
    return true;
  }
  return item.name.toLowerCase().includes(query);
}

/* =========================================================
   ПОИСК
   Неподходящие предметы затемняются.
========================================================= */

function searchItems() {
  const query = searchInput.value.trim().toLowerCase();
  const cards = document.querySelectorAll(".item-card");
  cards.forEach((card) => {
    const item = itemLookup.get(card.dataset.itemKey);
    const categoryOk =
      activeCategoryFilter === "all" || card.dataset.categoryKey === activeCategoryFilter;
    const salesOk = item ? !isHiddenBySalesFilter(item) : false;
    const isMatch = item ? itemMatchesQuery(item, query) : false;
    const visible = categoryOk && salesOk && (query === "" || isMatch);
    card.classList.toggle("match", query !== "" && isMatch && categoryOk && salesOk);
    card.classList.toggle("filter-hidden", !visible);
    card.hidden = !visible;
    const label = card.querySelector(".item-label");
    if (label) {
      if (query && isMatch && categoryOk && salesOk) {
        label.hidden = false;
        label.innerHTML = highlightText(translate(item.name), query);
      } else {
        label.hidden = true;
        label.textContent = "";
      }
    }
  });
  document.querySelectorAll(".category-section").forEach((section) => {
    const categoryOk =
      activeCategoryFilter === "all" || section.dataset.category === activeCategoryFilter;
    const hasVisibleCards = [...section.querySelectorAll(".item-card")].some((card) => !card.hidden);
    section.hidden = !categoryOk || !hasVisibleCards;
    if (!section.hidden && query) {
      revealAtlas(section);
    }
  });
  clearSearch.classList.toggle("visible", query !== "");
  if (floatingSearch) {
    floatingSearch.classList.toggle("has-query", query !== "");
    if (query) setFloatingSearchOpen(true);
  }
  updateCounter();
  syncSalesFilterWarning();

  reorderRegistry(query === "");
}

/* =========================================================
   СОРТИРОВКА
   Сортируем категории и предметы.
========================================================= */
function reorderRegistry(reset = false) {

    const sections = [...categoriesContainer.querySelectorAll(".category-section")];

    sections.forEach(section => {

        const grid = section.querySelector(".items-grid");
        const cards = [...grid.children];

        cards.sort((a, b) => {
            if (reset) {
                return Number(a.dataset.order) - Number(b.dataset.order);
            }

            const aMatch = a.classList.contains("match");
            const bMatch = b.classList.contains("match");

            if (aMatch !== bMatch)
                return bMatch - aMatch;

            return Number(a.dataset.order) - Number(b.dataset.order);
        });

        cards.forEach(card => grid.appendChild(card));
    });

    sections.sort((a, b) => {
        if (reset)
            return Number(a.dataset.order) - Number(b.dataset.order);

        const aHas = a.querySelector(".item-card.match") !== null;
        const bHas = b.querySelector(".item-card.match") !== null;

        if (aHas !== bHas)
            return bHas - aHas;

        return Number(a.dataset.order) - Number(b.dataset.order);
    });

    sections.forEach(section => categoriesContainer.appendChild(section));
}

function animateReorder(elements, reorder) {
    const first = new Map();

    elements.forEach(el => {
        first.set(el, el.getBoundingClientRect());
    });

    reorder();
    elements.forEach(el => {
        const last = el.getBoundingClientRect();

        const dx = first.get(el).left - last.left;
        const dy = first.get(el).top - last.top;

        if (!dx && !dy)
            return;

        el.animate([
            {
                transform: `translate(${dx}px, ${dy}px)`
            },
            {
                transform: "translate(0,0)"
            }
        ], {
            duration: 250,
            easing: "ease"
        });
    });
}

/* =========================================================
   СЧЁТЧИК
========================================================= */

function updateCounter() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  items.forEach((item) => {
    const categoryOk = activeCategoryFilter === "all" || item.category === activeCategoryFilter;
    if (!categoryOk) return;
    if (isHiddenBySalesFilter(item)) return;
    if (itemMatchesQuery(item, query)) {
      visibleCount++;
    }
  });
  const isSearch = query !== "";
  itemCounter.classList.toggle("is-search", isSearch);
  itemCounter.replaceChildren();
  const label = document.createElement("span");
  label.className = "item-counter-label";
  label.textContent = isSearch ? tr("items_found_label") : tr("items_count_label");
  const value = document.createElement("span");
  value.className = "item-counter-value";
  value.textContent = String(visibleCount);
  itemCounter.append(label, value);
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => (typeof entry === "string" ? entry : entry && entry.name))
      .filter((name) => typeof name === "string" && name.length > 0);
  } catch {
    return [];
  }
}

function writeHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
}

function pushHistory(item) {
  const previous = readHistory().filter((name) => name !== item.name);
  writeHistory([item.name, ...previous]);
}

function renderHistory(activeName = "") {
  const wrap = document.getElementById("modalHistory");
  const list = document.getElementById("modalHistoryList");
  if (!wrap || !list) return;
  const history = readHistory()
    .filter((name) => name && name !== activeName)
    .map((name) => itemLookup.get(name))
    .filter(Boolean);
  if (!history.length) {
    wrap.hidden = true;
    list.innerHTML = "";
    return;
  }
  wrap.hidden = false;
  list.innerHTML = "";
  history.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-chip";
    button.textContent = translate(item.name);
    button.addEventListener("click", () => openItemModal(item));
    list.appendChild(button);
  });
}

async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    const previous = button.textContent;
    button.textContent = tr("modal_copied");
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1200);
  } catch (error) {
    console.error(error);
  }
}

function trapModalFocus(event) {
  if (!itemModal.classList.contains("open") || event.key !== "Tab") return;
  const focusable = itemModal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* =========================================================
   МОДАЛЬНОЕ ОКНО
========================================================= */

function openItemModal(item) {
  lastFocusedElement = document.activeElement;
  document.getElementById("modalImage").src = asset("/assets/textures/" + item.image);
  document.getElementById("modalImage").alt = translate(item.name);
  const translatedName = translate(item.name);
  document.getElementById("modalName").textContent = translatedName;
  document.getElementById("modalNameValue").textContent = translatedName;
  const modalCategory = document.getElementById("modalCategoryFull");
  modalCategory.textContent = translate(item.category);
  modalCategory.dataset.category = item.category;
  document.getElementById("modalId").textContent = "minecraft:" + item.name;
  document.getElementById("modalWiki").href = "https://" + translate("wiki") + translate(item.name);
  pushHistory(item);
  renderHistory(item.name);
  itemModal.classList.add("open");
  itemModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const content = itemModal.querySelector(".modal-content");
  if (content) content.focus();
  modalFocusHandler = trapModalFocus;
  document.addEventListener("keydown", modalFocusHandler);
}

/* =========================================================
   ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
========================================================= */

function closeItemModal() {
  itemModal.classList.remove("open");
  itemModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (modalFocusHandler) {
    document.removeEventListener("keydown", modalFocusHandler);
    modalFocusHandler = null;
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}
document.getElementById("modalClose").addEventListener("click", closeItemModal);
document.querySelector(".modal-background").addEventListener("click", closeItemModal);
document.getElementById("copyIdBtn").addEventListener("click", () => {
  copyText(document.getElementById("modalId").textContent.trim(), document.getElementById("copyIdBtn"));
});
document.getElementById("copyNameBtn").addEventListener("click", () => {
  copyText(document.getElementById("modalName").textContent.trim(), document.getElementById("copyNameBtn"));
});

/* =========================================================
   СОБЫТИЯ
========================================================= */

searchInput.addEventListener("input", () => {
  setFloatingSearchOpen(true);
  searchItems();
});
if (searchToggle) {
  searchToggle.addEventListener("click", () => {
    if (floatingSearch.classList.contains("is-open") || floatingSearch.classList.contains("has-query")) {
      if (document.activeElement === searchInput) {
        closeFloatingSearch({ clear: searchInput.value.trim() === "" });
        return;
      }
    }
    openFloatingSearch();
  });
}
document.addEventListener("pointerdown", (event) => {
  if (!floatingSearch || floatingSearch.contains(event.target)) return;
  if (searchInput.value.trim() !== "") return;
  closeFloatingSearch();
});
if (categoryFilters) {
  categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-chip");
    if (!button) return;
    activeCategoryFilter = button.dataset.category || "all";
    categoryFilters.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip === button);
    });
    searchItems();
  });
}
categoriesContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".item-card[data-item-key]");
  if (!card || !categoriesContainer.contains(card)) {
    return;
  }
  const item = itemLookup.get(card.dataset.itemKey);
  if (item) {
    openItemModal(item);
  }
});
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchItems();
  openFloatingSearch();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (itemModal && itemModal.classList.contains("open")) {
      closeItemModal();
      return;
    }
    if (floatingSearch && (floatingSearch.classList.contains("is-open") || searchInput.value.trim())) {
      closeFloatingSearch({ clear: true });
      return;
    }
    if (typeof window.closeMobileMenu === "function") {
      window.closeMobileMenu();
    }
  }
  if (
    event.code === "Slash" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey
  ) {
    if (itemModal && itemModal.classList.contains("open")) return;
    const target = event.target;
    const tag = (target && target.tagName) || "";
    const isSearchField = target === searchInput;
    if ((tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) && !isSearchField) {
      return;
    }
    event.preventDefault();
    toggleFloatingSearch();
  }
});

/* =========================================================
   ЗАПУСК РЕЕСТРА
========================================================= */

async function initialize() {
  try {
    if (window.PplI18n) {
      if (!Object.keys(window.PplI18n.translations).length) {
        await window.PplI18n.loadLanguage(getCurrentLanguage());
      }
      await window.PplI18n.loadItemNames(getCurrentLanguage());
    }
    const results = await Promise.all([
      loadItems(),
      loadAtlasData(),
      loadItemAliases(),
      loadBadsellFilter(),
    ]);
    items = results[0];
    itemLookup.clear();
    items.forEach((item) => {
      itemLookup.set(item.name, item);
    });
    bindSalesFilterToggle();
    renderCatalogue();
  } catch (error) {
    console.error(error);
    categoriesContainer.innerHTML = `
                <div class="loading loading-error">
                    <p>${tr("load_error")}</p>
                    <small>${error.message}</small>
                    <p class="load-error-hint">${tr("load_error_hint")}</p>
                </div>
            `;
  }
}

function startRegistry() {
  initialize();
}

if (window.PplI18n && window.PplI18n.translations && Object.keys(window.PplI18n.translations).length) {
  startRegistry();
} else {
  document.addEventListener("ppl:layout-ready", startRegistry, { once: true });
}

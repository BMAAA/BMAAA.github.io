const LANG_STORAGE_KEY = "ppl_lang";
const DEFAULT_LANG = "ru_ru";
const UI_FILES = {
  ru_ru: "/loc/ui_ru_ru.json",
  en_us: "/loc/ui_en_us.json",
};
const ITEM_FILES = {
  ru_ru: "/loc/items_ru_ru.json",
  en_us: "/loc/items_en_us.json",
};

let translations = {};
let itemsLoaded = false;
let currentLanguage = localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG;

function asset(path) {
  return window.PplBase ? window.PplBase.url(path) : path;
}

async function loadLanguage(language) {
  const response = await fetch(asset(UI_FILES[language]));
  if (!response.ok) {
    throw new Error("Не удалось загрузить язык");
  }
  translations = await response.json();
  itemsLoaded = false;
  currentLanguage = language;
  localStorage.setItem(LANG_STORAGE_KEY, language);
  document.documentElement.lang = language === "en_us" ? "en" : "ru";
}

async function loadItemNames(language = currentLanguage) {
  if (itemsLoaded && language === currentLanguage) return;
  const response = await fetch(asset(ITEM_FILES[language]));
  if (!response.ok) {
    throw new Error("Не удалось загрузить названия предметов");
  }
  const items = await response.json();
  translations = { ...translations, ...items };
  itemsLoaded = true;
}

function t(key) {
  return translations[key] || key;
}

function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) return;
    el.setAttribute("aria-label", t(key));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (!key) return;
    el.setAttribute("title", t(key));
  });
}

window.PplI18n = {
  LANG_STORAGE_KEY,
  DEFAULT_LANG,
  UI_FILES,
  ITEM_FILES,
  get translations() {
    return translations;
  },
  get currentLanguage() {
    return currentLanguage;
  },
  get itemsLoaded() {
    return itemsLoaded;
  },
  loadLanguage,
  loadItemNames,
  t,
  applyI18n,
};

const CSV_FILE = 'items_ids.csv';
const IMAGE_PATH = 'images/';
const FLAG_PATH = 'flags/'
let translationCache = {};

let items = [];
let currentSort = 'name';
let sortDirection = -1;
let currentLanguage = 'ru';
let translationMap = {};

// Тексты интерфейса для разных языков
const uiTranslations = {
    ru: {
        title: "Реестр торговой зоны Pepeland 10",
        subtitle: "Таблица большинства предметов и соответствующей им категории в ТЗ",
        note: "Разные варианты одних и тех же блоков продаются в одной категории!",
        search_placeholder: "Поиск предметов...",
        item_column: "Предмет",
        category_column: "Категория",
        north_segment: "Северный сегмент",
        east_segment: "Восточный сегмент",
        south_segment: "Южный сегмент",
        west_segment: "Западный сегмент",
        gallery: "Галерея мапартов",
        misc: "Разное",
        blocks: "Блоки",
        valuables: "Ценности",
        dyes: "Краски и растения",
        food_potions: "Еда и зелья",
        mob_loot: "Лут с мобов",
        armor_tools: "Броня и инструменты",
        books: "Книжки",
        west_gallery: "Западная галерея",
        east_gallery: "Восточная галерея",
        footer_line1: "bmaaa was here |",
        footer_line2: "Not an official Minecraft product. We are in no way affiliated with or endorsed by Mojang Synergies AB, Microsoft Corporation or other rightsholders.",
        footer_line3: "Не является официальным продуктом сети серверов PepeLand",
        switch_to_english: "Переключить на английский",
        switch_to_russian: "Switch to Russian",
        pplhelper: "Совет: Установив мод <b><a href='https://pplh.ru/'>PPLHelper</a></b>, вы можете узнать категорию предмета, введя в чат команду <b>/pplh registry minecraft:id</b>",
    },
    en: {
        title: "Pepeland 10 Trade Zone Registry",
        subtitle: "Table of most items and their corresponding category in the Trade Zone",
        note: "Different variants of the same blocks are sold in the same category!",
        search_placeholder: "Search items...",
        item_column: "Item",
        category_column: "Category",
        north_segment: "North Segment",
        east_segment: "East Segment",
        south_segment: "South Segment",
        west_segment: "West Segment",
        gallery: "Map Gallery",
        misc: "Various",
        blocks: "Blocks",
        valuables: "Valuables",
        dyes: "Dyes & Plants",
        food_potions: "Food & Potions",
        mob_loot: "Mob Loot",
        armor_tools: "Armor & Tools",
        books: "Books",
        west_gallery: "West Gallery",
        east_gallery: "East Gallery",
        footer_line1: "bmaaa was here |",
        footer_line2: "Not an official Minecraft product. We are in no way affiliated with or endorsed by Mojang Synergies AB, Microsoft Corporation or other rightsholders.",
        footer_line3: "Not an official product of the PepeLand server network",
        switch_to_english: "Switch to English",
        switch_to_russian: "Переключить на русский",
        pplhelper: "Tip: By installing the <b><a href='https://pplh.ru/'>PPLHelper</a></b> mod, you can find out the item's category by entering the command <b>/pplh registry minecraft:id</b> in the chat",
    }
};

// Названия категорий на различных языках
const categoryTranslations = {
    ru: {
        "Разное": "Разное",
        "Блоки": "Блоки",
        "Краски и растения": "Краски и растения",
        "Ценности": "Ценности",
        "Еда и зелья": "Еда и зелья",
        "Лут с мобов": "Лут с мобов",
        "Броня и инструменты": "Броня и инструменты",
        "Книжки": "Книжки",
        "!!!ПРОДАЖА ЗАПРЕЩЕНА!!!": "!!!ПРОДАЖА ЗАПРЕЩЕНА!!!",
        "!!!ВАЛЮТА СЕРВЕРА!!!": "!!!ВАЛЮТА СЕРВЕРА!!!",
        "Галерея": "Галерея"
    },
    en: {
        "Разное": "Various",
        "Блоки": "Blocks",
        "Краски и растения": "Plants & Dyes",
        "Ценности": "Valuables",
        "Еда и зелья": "Food & Potions",
        "Лут с мобов": "Mob Loot",
        "Броня и инструменты": "Armor & Tools",
        "Книжки": "Books",
        "!!!ПРОДАЖА ЗАПРЕЩЕНА!!!": "!!!SALE FORBIDDEN!!!",
        "!!!ВАЛЮТА СЕРВЕРА!!!": "!!!SERVER CURRENCY!!!",
        "Галерея": "Gallery"
    }
};
// Грузим данные (Таблицы категорий, локализационные файлы и тп)
async function init() {
    try {
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            currentLanguage = savedLang;
        }

        await loadTranslation(currentLanguage);
        await loadCSVData();
        renderTable(items);
        setupEventListeners();
        setupLanguageSelector();
        updateUITexts();
        updateLanguageSelector();
        sortItems('name');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Проверьте консоль для деталей.');
    }
}

// Функция выбора языка
function updateLanguageSelector() {
    const languageOptions = document.querySelectorAll('.language-option');
    const currentOption = document.querySelector(`.language-option[data-lang="${currentLanguage}"]`);

    languageOptions.forEach(option => {
        option.classList.remove('active');
    });

    if (currentOption) {
        currentOption.classList.add('active');
    }
}


// Загружаем флаги
function preloadFlags() {
    return new Promise((resolve) => {
        const flags = ['ru-flag.png', 'us-flag.png'];
        let loadedCount = 0;

        flags.forEach(flagName => {
            const img = new Image();
            img.src = `${FLAG_PATH}${flagName}`;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === flags.length) {
                    resolve();
                }
            };
            img.onerror = () => {
                console.warn(`Не удалось предзагрузить флаг: ${flagName}`);
                loadedCount++;
                if (loadedCount === flags.length) {
                    resolve();
                }
            };
        });

        setTimeout(resolve, 1000);
    });
}

// Загружаем языковые файлы
async function loadTranslation(lang) {
    if (translationCache[lang]) {
        translationMap = translationCache[lang];
        return;
    }

    const translationFile = lang === 'ru' ? 'loc/ru_ru.json' : 'loc/en_us.json';
    try {
        const response = await fetch(translationFile);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        translationMap = await response.json();
        translationCache[lang] = translationMap;
    } catch (error) {
        console.error('Ошибка загрузки перевода:', error);
        throw error;
    }
}

// Обрабатываем items.csv
async function loadCSVData() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const csv = await response.text();
        items = parseCSV(csv);

        // Применяем перевод к названиям предметов и категорий
        items = items.map(item => {
            const displayName = translationMap[item.name] || item.name;
            const translatedCategory = categoryTranslations[currentLanguage][item.category] || item.category;

            return {
                ...item,
                displayName: displayName,
                originalName: item.name,
                translatedCategory: translatedCategory
            };
        });

    } catch (error) {
        console.error('Ошибка загрузки CSV:', error);
        throw error;
    }
}

function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const obj = {};
        const currentline = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j] ? currentline[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}


// Выводим табличку
function renderTable(data) {
    const tableBody = document.getElementById('table-body');

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px;">
            ${currentLanguage === 'ru' ? 'Предметы не найдены' : 'No items found'}
        </td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach(item => {
        const row = document.createElement('tr');

        const itemCell = document.createElement('td');
        itemCell.className = 'item-cell';

        const img = document.createElement('img');
        img.src = `${IMAGE_PATH}${item.image}`;
        img.alt = item.displayName;
        img.className = 'item-image';
        img.loading = 'lazy';
        img.onerror = function() {
            this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><rect width="24" height="24" fill="%232d3748"/><text x="12" y="16" font-family="Arial" font-size="12" fill="%2394a3b8" text-anchor="middle">?</text></svg>';
        };

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.displayName;

        itemCell.appendChild(img);
        itemCell.appendChild(nameSpan);

        const categoryCell = document.createElement('td');
        const categorySpan = document.createElement('span');
        categorySpan.textContent = item.translatedCategory;
        categorySpan.className = 'category';
        categoryCell.appendChild(categorySpan);

        row.appendChild(itemCell);
        row.appendChild(categoryCell);
        fragment.appendChild(row);
    });

    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
}

function sortItems(sortBy) {
    if (currentSort === sortBy) {
        sortDirection *= -1;
    } else {
        currentSort = sortBy;
        sortDirection = 1;
    }

    items.sort((a, b) => {
        let valA, valB;

        if (sortBy === 'name') {
            valA = a.displayName.toLowerCase();
            valB = b.displayName.toLowerCase();
        } else {
            valA = a[sortBy].toLowerCase();
            valB = b[sortBy].toLowerCase();
        }

        if (valA < valB) return -1 * sortDirection;
        if (valA > valB) return 1 * sortDirection;
        return 0;
    });

    renderTable(items);
    updateSortIndicator(sortBy);
}

function updateSortIndicator(sortBy) {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });

    const currentTh = document.querySelector(`th[data-sort="${sortBy}"]`);

    if (sortDirection === 1) {
        currentTh.classList.add('sorted-asc');
    } else {
        currentTh.classList.add('sorted-desc');
    }
}

// Добавляем небольшую задержку чтобы потом серверу не было больно
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Поиск предметов
function searchItems(query) {
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length < 2) {
        renderTable(items);
        return;
    }

    const filtered = items.filter(item => {
        const translatedCategory = categoryTranslations[currentLanguage][item.category] || item.category;
        return (
            item.displayName.toLowerCase().includes(lowerQuery) ||
            item.originalName.toLowerCase().includes(lowerQuery)
        );
    });

    renderTable(filtered);
}

// Подгрузка файлов локализаций
function updateUITexts() {
    const texts = uiTranslations[currentLanguage];

    document.querySelector('h1').textContent = texts.title;
    document.querySelector('header p').textContent = texts.subtitle;
    document.querySelectorAll('header p')[1].textContent = texts.note;
    document.querySelectorAll('header p')[2].innerHTML = texts.pplhelper;

    document.getElementById('search').placeholder = texts.search_placeholder;

    document.querySelector('th[data-sort="name"]').textContent = texts.item_column;
    document.querySelector('th[data-sort="category"]').textContent = texts.category_column;

    document.querySelectorAll('.zone-card h3')[0].textContent = texts.north_segment;
    document.querySelectorAll('.zone-card h3')[1].textContent = texts.east_segment;
    document.querySelectorAll('.zone-card h3')[2].textContent = texts.south_segment;
    document.querySelectorAll('.zone-card h3')[3].textContent = texts.west_segment;
    document.querySelectorAll('.zone-card h3')[4].textContent = texts.gallery;

    document.querySelectorAll('.subcategory-header')[0].textContent = texts.misc;
    document.querySelectorAll('.subcategory-header')[1].textContent = texts.blocks;
    document.querySelectorAll('.subcategory-header')[2].textContent = texts.valuables;
    document.querySelectorAll('.subcategory-header')[3].innerHTML = `${texts.dyes}`;
    document.querySelectorAll('.subcategory-header')[4].textContent = texts.food_potions;
    document.querySelectorAll('.subcategory-header')[5].textContent = texts.mob_loot;
    document.querySelectorAll('.subcategory-header')[6].innerHTML = `${texts.armor_tools}`;
    document.querySelectorAll('.subcategory-header')[7].textContent = texts.books;
    document.querySelectorAll('.subcategory-header')[8].textContent = texts.west_gallery;
    document.querySelectorAll('.subcategory-header')[9].textContent = texts.east_gallery;

    const footerParagraphs = document.querySelectorAll('footer p');
    footerParagraphs[0].innerHTML = `${texts.footer_line1} <img src="https://cdn.7tv.app/emote/01G2JWCB9G0004JR3T5PESP5V7/4x.avif" height="25px;" style="transform: translate(0px, 5px);"> by ItzKITb`;
    footerParagraphs[1].innerHTML = `${texts.footer_line2} <br> ${texts.footer_line3}`;
}

function updateLanguageButton() {
     const langButton = document.getElementById('language-switcher');
    const flagImg = langButton.querySelector('img');

    flagImg.onerror = function() {
        console.error(`Не удалось загрузить флаг для языка: ${currentLanguage}`);
        langButton.classList.add('fallback');
        flagImg.style.display = 'none';
    };

    flagImg.onload = function() {
        langButton.classList.remove('fallback');
        flagImg.style.display = 'block';
    };

    if (currentLanguage === 'ru') {
        flagImg.src = `${FLAG_PATH}us-flag.png`;
        flagImg.alt = uiTranslations.en.switch_to_english;
        langButton.title = uiTranslations.en.switch_to_english;
    } else {
        flagImg.src = `${FLAG_PATH}ru-flag.png`;
        flagImg.alt = uiTranslations.ru.switch_to_russian;
        langButton.title = uiTranslations.ru.switch_to_russian;
    }
}

// Алгоритм смены языка
async function switchLanguage(lang = null) {
    if (lang) {
        currentLanguage = lang;
    } else {
        currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    }

    localStorage.setItem('language', currentLanguage);

    await loadTranslation(currentLanguage);

    items = items.map(item => ({
        ...item,
        displayName: translationMap[item.name] || item.name,
        translatedCategory: categoryTranslations[currentLanguage][item.category] || item.category
    }));

    updateUITexts();
    updateLanguageSelector(); // Обновляем отображение выбранного языка

    const currentSearch = document.getElementById('search').value;
    if (currentSearch) {
        searchItems(currentSearch);
    } else {
        renderTable(items);
    }
}

// Окно выбора языка
function setupLanguageSelector() {
    const languageToggle = document.getElementById('language-toggle');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');

    const overlay = document.createElement('div');
    overlay.className = 'language-overlay';
    document.body.appendChild(overlay);

    function toggleDropdown() {
        const isShowing = languageDropdown.classList.contains('show');

        if (isShowing) {
            hideDropdown();
        } else {
            showDropdown();
        }
    }

    function showDropdown() {
        languageDropdown.classList.add('show');
        languageToggle.classList.add('active');
        overlay.classList.add('active');

        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 10);
    }

    function hideDropdown() {
        languageDropdown.classList.remove('show');
        languageToggle.classList.remove('active');
        overlay.classList.remove('active');
        document.removeEventListener('click', handleClickOutside);
    }

    function handleClickOutside(event) {
        if (!languageToggle.contains(event.target) && !languageDropdown.contains(event.target)) {
            hideDropdown();
        }
    }

    languageToggle.addEventListener('click', function(event) {
        event.stopPropagation();
        toggleDropdown();
    });

    languageOptions.forEach(option => {
        option.addEventListener('click', function(event) {
            event.stopPropagation();
            const selectedLang = this.getAttribute('data-lang');
            if (selectedLang !== currentLanguage) {
                switchLanguage(selectedLang);
            }
            hideDropdown();
        });
    });

    overlay.addEventListener('click', hideDropdown);

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideDropdown();
        }
    });

    hideDropdown();
}

function setupEventListeners() {
    document.getElementById('search').addEventListener('input', debounce((e) => {
        searchItems(e.target.value);
    }, 300));

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            sortItems(th.dataset.sort);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);

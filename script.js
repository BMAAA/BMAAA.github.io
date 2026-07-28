const CSV_FILE = 'items_ids.csv';
const IMAGE_PATH = 'images/';
const FLAG_PATH = 'flags/';
let translationCache = {};

let items = [];
let currentSort = 'name';
let sortDirection = -1;
let currentLanguage = 'ru';
let translationMap = {};
let expandedGroups = new Set();
let groupIconIndex = 0;
let groupIconTimers = [];
let modalOpen = false;

// Тексты интерфейса
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
    },
    en: {
        title: "PPL10 trade zone registry",
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
        switch_to_russian: "Переключить на русский"
    }
};

// Названия категорий на разных языках
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

// ---------------------- ЗАГРУЗКА ДАННЫХ ----------------------
async function init() {
    try {
        const savedLang = localStorage.getItem('language');
        if (savedLang) currentLanguage = savedLang;

        await loadTranslation(currentLanguage);
        await loadCSVData();
        renderTable(items);
        setupEventListeners();
        const mainSearch = document.getElementById('search');
        const modalSearch = document.getElementById('modal-search');
        if (mainSearch && modalSearch) {
            // Синхронизация при вводе в основном поле
            mainSearch.addEventListener('input', debounce((e) => {
                const val = e.target.value;
                modalSearch.value = val;
                searchItems(val);
            }, 300));

            // Синхронизация при вводе в модальном поле
            modalSearch.addEventListener('input', debounce((e) => {
                const val = e.target.value;
                mainSearch.value = val;
                searchItems(val);
            }, 300));
        }
        updateUITexts();
        updateLangButtons();
        sortItems('name');
        initModal();
        initFloatButton();
        startGroupIconAnimation()

        // Обработчики для кнопок языка в панели
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                if (lang && lang !== currentLanguage) {
                    switchLanguage(lang);
                }
            });
        });


    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Проверьте консоль для деталей.');
    }
}
function updateLanguageSelector() {
    const languageOptions = document.querySelectorAll('.language-option');
    const currentOption = document.querySelector(`.language-option[data-lang="${currentLanguage}"]`);
    languageOptions.forEach(option => option.classList.remove('active'));
    if (currentOption) currentOption.classList.add('active');
}

function preloadFlags() {
    return new Promise((resolve) => {
        const flags = ['ru-flag.png', 'us-flag.png'];
        let loadedCount = 0;
        flags.forEach(flagName => {
            const img = new Image();
            img.src = `${FLAG_PATH}${flagName}`;
            img.onload = () => { loadedCount++; if (loadedCount === flags.length) resolve(); };
            img.onerror = () => { loadedCount++; if (loadedCount === flags.length) resolve(); };
        });
        setTimeout(resolve, 1000);
    });
}

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

async function loadCSVData() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csv = await response.text();
        items = parseCSV(csv);
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

// ---------------------- ОТРИСОВКА ТАБЛИЦЫ ----------------------
function renderTable(data, searchQuery = '') {
    const tableBody = document.getElementById('table-body');
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="2" class="no-results">
                    ${currentLanguage === 'ru' ? 'Предметы не найдены' : 'No items found'}
                </td>
            </tr>
        `;
        return;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const groups = new Map();
    const tableElements = [];

    data.forEach(item => {
        const groupName = item.item_category?.trim();
        if (groupName) {
            if (!groups.has(groupName)) groups.set(groupName, []);
            groups.get(groupName).push(item);
        } else {
            tableElements.push({
                type: 'item',
                item: item,
                sortName: item.displayName,
                sortCategory: item.translatedCategory
            });
        }
    });

    if (normalizedQuery.length >= 2) {
        groups.forEach((_, groupName) => {
            if (!expandedGroups.has(groupName)) {
                expandedGroups.add(groupName);
            }
        });
    }

    groups.forEach((groupItems, groupName) => {
        // Определяем наиболее частую категорию для группы (для отображения)
        const categoryCount = new Map();
        groupItems.forEach(item => {
            const cat = item.translatedCategory;
            categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        });
        let mostPopularCategory = '';
        let highestCount = 0;
        categoryCount.forEach((count, cat) => {
            if (count > highestCount) {
                highestCount = count;
                mostPopularCategory = cat;
            }
        });
        if (!mostPopularCategory && groupItems.length > 0) {
            mostPopularCategory = groupItems[0].translatedCategory;
        }

        tableElements.push({
            type: 'group',
            groupName: groupName,
            items: groupItems,
            sortName: getGroupName(groupName),   // для сортировки по имени
            sortCategory: mostPopularCategory    // для сортировки по категории
        });
    });

    tableElements.sort((a, b) => {
        let valueA, valueB;
        if (currentSort === 'category') {
            valueA = a.sortCategory;
            valueB = b.sortCategory;
        } else {
            valueA = a.sortName;
            valueB = b.sortName;
        }
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
        if (valueA < valueB) return -1 * sortDirection;
        if (valueA > valueB) return 1 * sortDirection;
        // Стабильность при равных значениях
        const nameA = a.sortName.toLowerCase();
        const nameB = b.sortName.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    const fragment = document.createDocumentFragment();
    tableElements.forEach(element => {
        if (element.type === 'item') {
            fragment.appendChild(createItemRow(element.item));
        } else {
            const { groupName, items: groupItems, sortCategory } = element;
            const isExpanded = expandedGroups.has(groupName);
            fragment.appendChild(createGroupRow(groupName, groupItems, isExpanded, sortCategory));
            groupItems.forEach(item => {
                const itemRow = createItemRow(item);
                itemRow.classList.add('group-item-row');
                fragment.appendChild(itemRow);
            });
        }
    });

    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    applyAllGroupStates();

    startGroupIconAnimation();
}

function createItemRow(item) {
    const row = document.createElement('tr');
    const itemCell = document.createElement('td');
    itemCell.className = 'item-cell';
    const img = document.createElement('img');
    img.src = `${IMAGE_PATH}${item.image}`;
    img.alt = item.displayName;
    img.className = 'item-image';
    img.loading = 'lazy';
    img.onerror = function() {
        this.src = 'data:image/svg+xml;utf8,' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">' +
            '<rect width="24" height="24" fill="%232d3748"/>' +
            '<text x="12" y="16" font-family="Arial" font-size="12" fill="%2394a3b8" text-anchor="middle">?</text>' +
            '</svg>';
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
    return row;
}

function createGroupRow(groupName, groupItems, isExpanded, groupCategory) {
    const groupRow = document.createElement('tr');
    groupRow.className = 'group-row';
    if (isExpanded) groupRow.classList.add('expanded');
    groupRow.dataset.group = groupName;

    const nameCell = document.createElement('td');
    const categoryCell = document.createElement('td');
    const groupButton = document.createElement('button');
    groupButton.type = 'button';
    groupButton.className = 'group-header';

    const groupImage = document.createElement('img');
    groupImage.className = 'group-image';
    groupImage.dataset.groupItems = JSON.stringify(groupItems.map(item => item.image));
    groupImage.dataset.currentIndex = '0';
    groupImage.src = `${IMAGE_PATH}${groupItems[0].image}`;
    groupImage.alt = getGroupName(groupName);

    const arrow = document.createElement('span');
    arrow.className = 'group-arrow';
    arrow.textContent = isExpanded ? '▼' : '▶';

    const title = document.createElement('span');
    title.className = 'group-title';
    title.textContent = getGroupName(groupName);

    groupButton.appendChild(groupImage);
    groupButton.appendChild(arrow);
    groupButton.appendChild(title);

    groupRow.addEventListener('click', function(e) {
        if (e.target.closest('a')) return;
        toggleGroup(groupName);
    });
    nameCell.appendChild(groupButton);

    const category = document.createElement('span');
    category.className = 'category group-category';
    category.textContent = groupCategory;
    categoryCell.appendChild(category);

    groupRow.appendChild(nameCell);
    groupRow.appendChild(categoryCell);
    return groupRow;
}

function toggleGroup(groupName) {
    const groupRow = document.querySelector(`.group-row[data-group="${groupName}"]`);
    if (!groupRow) return;
    const isExpanded = expandedGroups.has(groupName);
    if (isExpanded) {
        expandedGroups.delete(groupName);
    } else {
        expandedGroups.add(groupName);
    }
    applyGroupState(groupRow);
}

function applyGroupState(groupRow) {
    const groupName = groupRow.dataset.group;
    const expand = expandedGroups.has(groupName);
    groupRow.classList.toggle('expanded', expand);

    const arrow = groupRow.querySelector('.group-arrow');
    if (arrow) {
        arrow.textContent = expand ? '▼' : '▶';
    }

    let nextRow = groupRow.nextElementSibling;
    while (nextRow && !nextRow.classList.contains('group-row')) {
        if (nextRow.classList.contains('group-item-row')) {
            nextRow.style.display = expand ? '' : 'none';
        }
        nextRow = nextRow.nextElementSibling;
    }
}

function applyAllGroupStates() {
    document.querySelectorAll('.group-row').forEach(row => applyGroupState(row));
}

function getMostPopularCategory(groupItems) {
    const categoryCount = new Map();
    groupItems.forEach(item => {
        const category = item.translatedCategory;
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });
    let mostPopularCategory = '';
    let highestCount = 0;
    categoryCount.forEach((count, category) => {
        if (count > highestCount) {
            highestCount = count;
            mostPopularCategory = category;
        }
    });
    if (Object.keys(Object.fromEntries(categoryCount)).length != 1) {
        console.log(`Группа "${groupItems[0].item_category}":`, Object.fromEntries(categoryCount));
    }
    return mostPopularCategory;
}

function startGroupIconAnimation() {
    groupIconTimers.forEach(timer => clearInterval(timer));
    groupIconTimers = [];
    const groupImages = document.querySelectorAll('.group-image');
    groupImages.forEach((image, index) => {
        const changeIcon = () => {
            const images = JSON.parse(image.dataset.groupItems);
            if (images.length <= 1) return;
            let currentIndex = Number(image.dataset.currentIndex);
            currentIndex++;
            if (currentIndex >= images.length) currentIndex = 0;
            image.classList.add('changing');
            setTimeout(() => {
                image.src = `${IMAGE_PATH}${images[currentIndex]}`;
                image.dataset.currentIndex = currentIndex;
                image.classList.remove('changing');
            }, 150);
        };
        const randomDelay = Math.random() * 5000;
        const startTimeout = setTimeout(() => {
            changeIcon();
            const interval = setInterval(changeIcon, 5000);
            groupIconTimers.push(interval);
        }, randomDelay);
        groupIconTimers.push(startTimeout);
    });
}

function getGroupName(groupName) {
    return translationMap[groupName] || groupName;
}

function renderCurrentView() {
    const searchInput = document.getElementById('search');
    const query = searchInput.value;
    if (query.trim().length >= 2) {
        searchItems(query);
    } else {
        renderTable(items);
    }
}

// ---------------------- СОРТИРОВКА И ПОИСК ----------------------
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

function searchItems(query) {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.length < 2) {
        renderTable(items);
        return;
    }
    const filtered = items.filter(item => {
        return item.displayName.toLowerCase().includes(lowerQuery) ||
               item.originalName.toLowerCase().includes(lowerQuery);
    });
    renderTable(filtered, lowerQuery);
}

// ---------------------- ОБНОВЛЕНИЕ UI (язык, ссылки, модалка) ----------------------
function updateUITexts() {
    const texts = uiTranslations[currentLanguage];

    document.querySelector('h1').textContent = texts.title;
    document.querySelector('header .header-subtitle').textContent = texts.subtitle;
    document.querySelector('header .header-note').textContent = texts.note;

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

    const exspan = document.querySelector('.exspan');
    if (exspan) {
        exspan.textContent = currentLanguage === 'ru' ? '🔗 Связанные с мной проекты' : '🔗 Other projects related to me';
    }

    const inspan = document.querySelector('.inspan');
    if (inspan) {
        inspan.textContent = currentLanguage === 'ru' ? '📁 Другие инструменты на сайте' : '📁 Other tools on the site';
    }

    const langLabel = document.querySelector('.panel-language .panel-label');
    if (langLabel) {
        langLabel.textContent = currentLanguage === 'ru' ? '🌐 Язык' : '🌐 Language';
    }
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === 'ru') {
            btn.textContent = currentLanguage === 'ru' ? 'Русский' : 'Russian';
        } else if (btn.dataset.lang === 'en') {
            btn.textContent = 'English';
        }
    });
    updateLangButtons();

    const externalLinks = document.querySelectorAll('.external-link');
    const internalLinks = document.querySelectorAll('.internal-link');

    const externalNames = currentLanguage === 'ru'
        ? ['PEPELAND 24', 'Лейбл ППЛ', 'Тизка (COMING SOON)']
        : ['PEPELAND 24', 'Label of PPL', 'Tiska (COMING SOON)'];
    const internalNames = currentLanguage === 'ru'
        ? ['Реестр ТЗ ППЛ10', '(COMING SOON)', '(COMING SOON)']
        : ['PPL10 trade zone registry', '(COMING SOON)', '(COMING SOON)'];

    externalLinks.forEach((el, i) => {
        if (i < externalNames.length) el.textContent = externalNames[i];
    });
    internalLinks.forEach((el, i) => {
        if (i < internalNames.length) el.textContent = internalNames[i];
    });

    const modalSections = document.querySelectorAll('.modal-section h3');
    if (modalSections.length >= 3) {
        modalSections[2].textContent = currentLanguage === 'ru' ? 'Связанные с мной проекты' : 'External Projects';
        modalSections[1].textContent = currentLanguage === 'ru' ? 'Другие утилиты' : 'Internal Projects';
        modalSections[0].textContent = currentLanguage === 'ru' ? 'Язык' : 'Language';
    }
    const modalLangBtns = document.querySelectorAll('.modal-lang-btn');
    modalLangBtns.forEach(btn => {
        if (btn.dataset.lang === 'ru') {
            btn.textContent = currentLanguage === 'ru' ? 'Русский' : 'Russian';
        } else if (btn.dataset.lang === 'en') {
            btn.textContent = 'English';
        }
        btn.style.background = btn.dataset.lang === currentLanguage ? 'var(--light)' : '';
    });

    const footerParagraphs = document.querySelectorAll('footer p');
    footerParagraphs[0].innerHTML = `${texts.footer_line1} <img src="https://cdn.7tv.app/emote/01G2JWCB9G0004JR3T5PESP5V7/4x.avif" height="25px;" style="transform: translate(0px, 5px);"> by ItzKITb`;
    footerParagraphs[1].innerHTML = `${texts.footer_line2} <br> ${texts.footer_line3}`;
}

// ---------------------- ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА ----------------------
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
    updateLangButtons();

    // Обновляем модальные кнопки языка
    document.querySelectorAll('.modal-lang-btn').forEach(btn => {
        btn.style.background = btn.dataset.lang === currentLanguage ? 'var(--light)' : '';
    });

    const currentSearch = document.getElementById('search').value;
    if (currentSearch) {
        searchItems(currentSearch);
    } else {
        renderTable(items);
    }
}

// ---------------------- МОДАЛЬНОЕ ОКНО ----------------------
function initModal() {
    const modal = document.getElementById('menu-modal');
    if (!modal) return;
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const langBtns = modal.querySelectorAll('.modal-lang-btn');


    function openModal() {
        modal.classList.add('open');
        modalOpen = true;
        document.body.style.overflow = 'hidden';
        const modalSearch = document.getElementById('modal-search');
        if (modalSearch) {
            modalSearch.value = document.getElementById('search').value;
        }
    }

    function closeModal() {
        modal.classList.remove('open');
        modalOpen = false;
        document.body.style.overflow = '';
        const modalSearch = document.getElementById('modal-search');
        if (modalSearch) {
            modalSearch.value = document.getElementById('search').value;
        }
    }

    if (mobileBtn) {
        mobileBtn.addEventListener('click', openModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOpen) closeModal();
    });

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang && lang !== currentLanguage) {
                switchLanguage(lang);
                langBtns.forEach(b => b.style.background = '');
                btn.style.background = 'var(--light)';
            }
            closeModal();
        });
    });
}

// ---------------------- НАСТРОЙКА СОБЫТИЙ ----------------------
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

function updateLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
    });
}

function initFloatButton() {
    const floatBtn = document.getElementById('float-menu-btn');
    const modal = document.getElementById('menu-modal');
    if (!floatBtn || !modal) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            floatBtn.classList.add('visible');
        } else {
            floatBtn.classList.remove('visible');
        }
    });

    floatBtn.addEventListener('click', () => {
        modal.classList.add('open');
        modalOpen = true;
        document.body.style.overflow = 'hidden';
    });
}

// ---------------------- ЗАПУСК ----------------------
document.addEventListener('DOMContentLoaded', init);
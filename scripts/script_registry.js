/* =========================================================
   НАСТРОЙКИ ФАЙЛОВ
========================================================= */

const CSV_FILE = "data/items.csv";


const LANGUAGE_FILES = {

    ru_ru: "loc/ru_ru.json",

    en_us: "loc/en_us.json"

};


/* =========================================================
   ДАННЫЕ
========================================================= */

let items = [];


let translations = {};


let currentLanguage = "ru_ru";

/* =========================================================
   ПОРЯДОК КАТЕГОРИЙ
========================================================= */

const CATEGORY_ORDER = [
    "cur",
    "forb",
    "gal",
    "var",
    "blo",
    "val",
    "dyp",
    "food",
    "loot",
    "arm",
    "books"
];

/* =========================================================
   АТЛАСЫ
========================================================= */

const ATLAS_DATA_FILE =
    "data/atlases/items_atlas.json";


const ATLAS_DIRECTORY =
    "assets/atlases/";


const SHADOW_ATLAS_DIRECTORY =
    "assets/atlases/shadows/";


const SHADOW_ATLAS_CELL_SIZE =
    52;


const SHADOW_DISPLAY_SIZE =
    104;


let atlasData =
    null;

/* =========================================================
   ЗАГРУЗКА ДАННЫХ АТЛАСОВ
========================================================= */

async function loadAtlasData() {

    const response =
        await fetch(
            ATLAS_DATA_FILE
        );


    if (
        !response.ok
    ) {
        throw new Error(
            "Не удалось загрузить данные атласов."
        );
    }


    atlasData =
        await response.json();

}

/* =========================================================
   ПРЕОБРАЗОВАНИЕ КЛЮЧА ПРЕДМЕТА
========================================================= */

function getIndexItemName(
    itemName
) {
    return (
        itemName.toUpperCase()
    );

}

/* =========================================================
   ИНДЕКСЫ ПРЕДМЕТОВ
========================================================= */

const ITEM_INDEX_LIST =
    main();

const ITEM_INDEX_MAP =
    new Map();


ITEM_INDEX_LIST.forEach(

    (
        itemName,
        index
    ) => {

        ITEM_INDEX_MAP.set(

            itemName
                .toUpperCase(),

            index

        );

    }

);

/* =========================================================
   СОРТИРОВКА ПРЕДМЕТОВ ПО INDEXES.JS
========================================================= */

function sortItemsByIndex(
    categoryItems
) {
    const sortedItems =
        [
            ...categoryItems
        ];
    sortedItems.forEach(

        item => {
            const indexName =
                getIndexItemName(
                    item.name
                );

            const exists =
                ITEM_INDEX_MAP.has(
                    indexName
                );

            if (
                !exists
            ) {
                logMissingIndexItem(
                    item
                );
            }
        }
    );

    sortedItems.sort(
        (
            firstItem,
            secondItem
        ) => {
            const firstName =

                getIndexItemName(
                    firstItem.name
                );


            const secondName =
                getIndexItemName(
                    secondItem.name
                );

            const firstIndex =
                ITEM_INDEX_MAP.get(
                    firstName
                );

            const secondIndex =
                ITEM_INDEX_MAP.get(
                    secondName
                );

            const firstExists =
                firstIndex
                !==
                undefined;

            const secondExists =
                secondIndex
                !==
                undefined;

            if (
                firstExists
                &&
                secondExists
            ) {
                return (
                    firstIndex
                    -
                    secondIndex
                );
            }

            if (
                firstExists
                &&
                !secondExists
            ) {
                return -1;
            }

            if (
                !firstExists
                &&
                secondExists
            ) {

                return 1;

            }

            return 0;

        }

    );


    return sortedItems;

}

/* =========================================================
   ПРЕДМЕТЫ, ОТСУТСТВУЮЩИЕ В INDEXES.JS
========================================================= */

const missingIndexItems =
    new Set();


function logMissingIndexItem(
    item
) {

    const indexName =
        getIndexItemName(
            item.name
        );

    if (
        missingIndexItems.has(
            indexName
        )
    ) {
        return;
    }

    missingIndexItems.add(
        indexName
    );


    console.warn(
        "[INDEXES] Предмет отсутствует в списке:",
        indexName
    );

}

/* =========================================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
========================================================= */

const categoriesContainer =
    document.getElementById(
        "categoriesContainer"
    );


const catalogue =
    document.getElementById(
        "catalogue"
    );


const searchInput =
    document.getElementById(
        "searchInput"
    );


const clearSearch =
    document.getElementById(
        "clearSearch"
    );


const itemCounter =
    document.getElementById(
        "itemCounter"
    );


const itemModal =
    document.getElementById(
        "itemModal"
    );


const itemLookup =
    new Map();


/* =========================================================
   ЗАГРУЗКА CSV
========================================================= */

async function loadCSV() {

    const response =
        await fetch(CSV_FILE);


    if (!response.ok) {

        throw new Error(
            "Не удалось загрузить CSV"
        );

    }


    const csvText =
        await response.text();


    return parseCSV(
        csvText
    );

}


/* =========================================================
   ПАРСЕР CSV

   Поддерживает:
   name,image,category

   Также поддерживает значения в кавычках.
========================================================= */

function parseCSV(csvText) {

    const lines =
        csvText
            .trim()
            .split(/\r?\n/);


    const headers =
        splitCSVLine(
            lines[0]
        );


    const result = [];


    for (
        let index = 1;
        index < lines.length;
        index++
    ) {

        if (
            !lines[index].trim()
        ) {
            continue;
        }


        const values =
            splitCSVLine(
                lines[index]
            );


        const item = {};


        headers.forEach(
            (
                header,
                columnIndex
            ) => {

                item[
                    header.trim()
                ] =
                    values[
                        columnIndex
                    ]?.trim() || "";

            }
        );


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


    for (
        let index = 0;
        index < line.length;
        index++
    ) {

        const character =
            line[index];


        if (
            character === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            character === ","
            &&
            !insideQuotes
        ) {

            values.push(
                currentValue
            );


            currentValue = "";


            continue;

        }


        currentValue +=
            character;

    }


    values.push(
        currentValue
    );


    return values;

}


/* =========================================================
   ЗАГРУЗКА ПЕРЕВОДОВ
========================================================= */

async function loadLanguage(
    language
) {

    const response =
        await fetch(
            LANGUAGE_FILES[
            language
            ]
        );


    if (!response.ok) {

        throw new Error(
            "Не удалось загрузить язык"
        );

    }


    translations =
        await response.json();


    currentLanguage =
        language;

}


/* =========================================================
   ПОЛУЧЕНИЕ ПЕРЕВОДА

   Если ключ отсутствует,
   возвращается сам ключ.
========================================================= */

function translate(key) {

    return (
        translations[key]
        ||
        key
    );

}


/* =========================================================
   ГРУППИРОВКА ПО КАТЕГОРИЯМ
========================================================= */

function groupItems() {

    const categories =
        {};


    items.forEach(
        item => {

            const category =
                item.category;


            if (
                !categories[
                category
                ]
            ) {

                categories[
                    category
                ] = [];

            }


            categories[
                category
            ].push(
                item
            );

        }
    );


    return categories;

}


/* =========================================================
   СОЗДАНИЕ КАТАЛОГА
========================================================= */

function renderCatalogue() {

    const groupedItems =
        groupItems();


    /*
       Получаем все категории,
       которые реально присутствуют
       в CSV.
    */

    const existingCategories =
        Object.keys(
            groupedItems
        );


    /*
       Сначала добавляем категории
       из CATEGORY_ORDER.
    */

    const orderedCategories =
        CATEGORY_ORDER.filter(
            category => {

                return (
                    groupedItems[
                    category
                    ]
                    !==
                    undefined
                );

            }
        );


    /*
       Ищем категории, которых
       нет в CATEGORY_ORDER.
    */

    const unspecifiedCategories =
        existingCategories.filter(
            category => {

                return (
                    !CATEGORY_ORDER.includes(
                        category
                    )
                );

            }
        );


    /*
       Неуказанные категории
       сортируются по алфавиту.

       Можно удалить .sort(),
       если нужно сохранить
       порядок из CSV.
    */

    unspecifiedCategories.sort(
        (
            firstCategory,
            secondCategory
        ) => {

            return (
                translate(
                    firstCategory
                )
                    .localeCompare(
                        translate(
                            secondCategory
                        ),
                        currentLanguage
                    )
            );

        }
    );


    /*
       Объединяем:

       1. Категории из CATEGORY_ORDER.
       2. Остальные категории.
    */

    const finalCategoryOrder = [

        ...orderedCategories,

        ...unspecifiedCategories

    ];


    /*
       Очищаем старый каталог.
    */

    categoriesContainer
        .innerHTML = "";


    /*
       Создаём категории
       в заданном порядке.
    */

    finalCategoryOrder.forEach(
        categoryKey => {

            const categoryItems =
                groupedItems[
                categoryKey
                ];


            const section =
                document.createElement(
                    "section"
                );


            section.className =
                "category-section";


            section.id =
                `category-${categoryKey}`;


            /*
               Заголовок категории.
            */

            const title =
                document.createElement(
                    "h3"
                );


            title.className =
                "category-title";


            title.textContent =
                translate(
                    categoryKey
                );


            /*
               Сетка предметов.
            */

            const grid =
                document.createElement(
                    "div"
                );


            grid.className =
                "items-grid";


            /*
               Добавляем предметы.
            */

            /*
               Сортируем предметы
               внутри категории.
            */

            const sortedCategoryItems =

                sortItemsByIndex(
                    categoryItems
                );


            /*
               Создаём иконки
               в новом порядке.
            */

            sortedCategoryItems.forEach(

                item => {

                    grid.appendChild(

                        createItemCard(
                            item
                        )

                    );

                }

            );


            /*
               Добавляем всё
               на страницу.
            */

            section.append(
                title,
                grid
            );


            categoriesContainer
                .appendChild(
                    section
                );

        }
    );


    updateCounter();

}

/* =========================================================
   СОЗДАНИЕ ИКОНКИ ИЗ АТЛАСА
========================================================= */

function createItemCard(
    item
) {

    const card =
        document.createElement(
            "button"
        );


    card.className =
        "item-card";


    card.type =
        "button";


    /*
       Переводы.
    */

    const translatedName =
        translate(
            item.name
        );


    const translatedCategory =
        translate(
            item.category
        );


    /*
       Данные для поиска.
    */

    card.dataset.name =
        translatedName
            .toLowerCase();


    card.dataset.category =
        translatedCategory
            .toLowerCase();


    /*
       Подсказка.
    */

    card.title =
        translatedName;


    /*
       Доступность.
    */

    card.setAttribute(

        "aria-label",

        translatedName

    );


    /*
       Получаем данные
       конкретного предмета.
    */

    const spriteData =

        atlasData
            ?.items
        ?.[item.name];


    /*
       Если предмета нет
       в JSON, создаём
       пустую иконку.
    */

    if (
        !spriteData
    ) {

        console.warn(

            "Предмет отсутствует в атласе:",

            item.name

        );


        card.classList.add(
            "atlas-missing"
        );


        return card;

    }


    /*
       Размер ячейки.
    */

    const cellSize =

        atlasData.cell_size;


    /*
       Количество ячеек
       в одной строке.
    */

    const columns =

        atlasData.columns;


    /*
       Размер отображения.
    */

    const displaySize =
        72;


    const spriteBleedGuard =
        0.5;


    /*
       Масштаб атласа.

       Например:

       44 / 16 = 2.75
    */

    const scale =

        (
            displaySize
            +
            spriteBleedGuard
            *
            2
        )
        /
        cellSize;


    /*
       Получаем размеры
       конкретного атласа.
    */

    const categoryAtlas =

        atlasData
            .categories
        ?.[
        item.category
        ];


    if (
        !categoryAtlas
    ) {

        console.warn(

            "Категория отсутствует в данных атласа:",

            item.category

        );


        return card;

    }


    card.dataset.itemKey =
        item.name;


    /*
       Путь к атласу.
    */

    const atlasURL =

        ATLAS_DIRECTORY

        +

        spriteData.atlas;


    const shadowAtlasURL =

        SHADOW_ATLAS_DIRECTORY

        +

        spriteData.atlas;


    const shadowScale =

        SHADOW_DISPLAY_SIZE

        /

        SHADOW_ATLAS_CELL_SIZE;


    const shadowAtlasWidth =

        categoryAtlas.width

        /

        cellSize

        *

        SHADOW_ATLAS_CELL_SIZE;


    const shadowAtlasHeight =

        categoryAtlas.height

        /

        cellSize

        *

        SHADOW_ATLAS_CELL_SIZE;


    const shadowX =

        spriteData.x

        /

        cellSize

        *

        SHADOW_ATLAS_CELL_SIZE;


    const shadowY =

        spriteData.y

        /

        cellSize

        *

        SHADOW_ATLAS_CELL_SIZE;


    /*
       Создаём элемент,
       показывающий участок
       общего изображения.
    */

    const imageContainer =

        document.createElement(
            "div"
        );


    imageContainer.className =

        "item-image";


    /*
       Размер элемента.
    */

    imageContainer.style.width =

        `${displaySize}px`;


    imageContainer.style.height =

        `${displaySize}px`;


    /*
       Общий атлас.
    */

    imageContainer.style.setProperty(
        "--item-atlas-image",
        `url("${atlasURL}")`
    );


    /*
       Атлас масштабируется
       вместе с координатами.
    */

    imageContainer.style.setProperty(
        "--item-atlas-size",
        `${categoryAtlas.width
        *
        scale

        }px ${categoryAtlas.height
        *
        scale

        }px`
    );


    /*
       Позиция нужной ячейки.
    */

    imageContainer.style.setProperty(
        "--item-atlas-position",
        `-${spriteData.x
        *
        scale
        +
        spriteBleedGuard

        }px -${spriteData.y
        *
        scale
        +
        spriteBleedGuard

        }px`
    );


    /*
       Не повторять атлас.
    */

    imageContainer.style.setProperty(
        "--shadow-atlas-image",
        `url("${shadowAtlasURL}")`
    );


    /*
       Сохраняем пиксельный вид.
    */

    imageContainer.style.setProperty(
        "--shadow-atlas-size",
        `${shadowAtlasWidth
        *
        shadowScale

        }px ${shadowAtlasHeight
        *
        shadowScale

        }px`
    );


    imageContainer.style.setProperty(
        "--shadow-atlas-position",
        `-${shadowX
        *
        shadowScale

        }px -${shadowY
        *
        shadowScale

        }px`
    );


    card.appendChild(
        imageContainer
    );


    return card;

}

/* =========================================================
   ПОИСК

   Неподходящие предметы затемняются.
========================================================= */

function searchItems() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();


    const cards =
        document.querySelectorAll(
            ".item-card"
        );


    cards.forEach(
        card => {

            const searchableText =
                `${card.dataset.name}
                 ${card.dataset.category}`;


            const isMatch =
                searchableText
                    .includes(
                        query
                    );


            card.classList.toggle(
                "dimmed",
                query !== ""
                &&
                !isMatch
            );


            card.classList.toggle(
                "match",
                query !== ""
                &&
                isMatch
            );

        }
    );


    clearSearch.classList.toggle(
        "visible",
        query !== ""
    );


    updateCounter();

}


/* =========================================================
   СЧЁТЧИК
========================================================= */

function updateCounter() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();


    let visibleCount = 0;


    items.forEach(
        item => {

            const name =
                translate(
                    item.name
                )
                    .toLowerCase();


            const category =
                translate(
                    item.category
                )
                    .toLowerCase();


            if (
                query === ""
                ||
                name.includes(query)
                ||
                category.includes(query)
            ) {

                visibleCount++;

            }

        }
    );


    itemCounter.textContent =
        query
            ? `Найдено: ${visibleCount}`
            : `Предметов: ${items.length}`;

}


/* =========================================================
   МОДАЛЬНОЕ ОКНО
========================================================= */

function openItemModal(
    item
) {

    document.getElementById(
        "modalImage"
    ).src =
        '/assets/textures/' + item.image;


    document.getElementById(
        "modalImage"
    ).alt =
        translate(
            item.name
        );


    document.getElementById(
        "modalName"
    ).textContent =
        translate(
            item.name
        );


    document.getElementById(
        "modalCategoryFull"
    ).textContent =
        translate(
            item.category
        );

    document.getElementById(
        "modalId"
    ).textContent =
        'minecraft:' + item.name;

    document.getElementById(
        "modalWiki"
    ).href =
        'https://' + translate('wiki') + translate(item.name);


    itemModal.classList.add(
        "open"
    );


    itemModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style
        .overflow =
        "hidden";

}


/* =========================================================
   ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
========================================================= */

function closeItemModal() {

    itemModal.classList.remove(
        "open"
    );


    itemModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style
        .overflow =
        "";

}


document.getElementById(
    "modalClose"
).addEventListener(
    "click",
    closeItemModal
);


document.querySelector(
    ".modal-background"
).addEventListener(
    "click",
    closeItemModal
);


/* =========================================================
   СОБЫТИЯ
========================================================= */

searchInput.addEventListener(
    "input",
    searchItems
);


let scrollIdleTimeout;


catalogue.addEventListener(
    "scroll",
    () => {

        catalogue.classList.add(
            "is-scrolling"
        );


        window.clearTimeout(
            scrollIdleTimeout
        );


        scrollIdleTimeout =
            window.setTimeout(
                () => {

                    catalogue.classList.remove(
                        "is-scrolling"
                    );

                },
                120
            );

    },
    {
        passive: true
    }
);


categoriesContainer.addEventListener(
    "click",
    event => {

        const card =
            event.target.closest(
                ".item-card[data-item-key]"
            );


        if (
            !card
            ||
            !categoriesContainer.contains(
                card
            )
        ) {

            return;

        }


        const item =
            itemLookup.get(
                card.dataset.itemKey
            );


        if (
            item
        ) {

            openItemModal(
                item
            );

        }

    }
);


clearSearch.addEventListener(
    "click",
    () => {
        searchInput.value =
            "";
        searchItems();
        searchInput.focus();

    }
);

/* Закрытие по Escape */

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape"
        ) {
            closeItemModal();
            closeMobileMenu();

        }

    }
);

/* =========================================================
   ЗАПУСК РЕЕСТРА
========================================================= */

async function initialize() {

    try {
        const results =
            await Promise.all([
                loadCSV(),
                loadAtlasData(),
                loadLanguage(
                    currentLanguage
                )
            ]);


        items =
            results[0];


        itemLookup.clear();


        items.forEach(
            item => {

                itemLookup.set(
                    item.name,
                    item
                );

            }
        );


        renderCatalogue();


    }
    catch (
    error
    ) {
        console.error(
            error
        );

        categoriesContainer
            .innerHTML = `
                <div class="loading">
                    <p>
                        Не удалось
                        загрузить каталог.
                    </p>
                    <small>
                        ${error.message}
                    </small>
                </div>
            `;

    }

}

initialize();

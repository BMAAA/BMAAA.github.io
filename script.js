const CSV_FILE = 'items.csv';
const IMAGE_PATH = 'images/';

let items = [];
let currentSort = 'name';
let sortDirection = 1;

async function init() {
    try {
        await loadCSVData();
        renderTable(items);
        setupEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Проверьте консоль для деталей.');
    }
}

async function loadCSVData() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const csv = await response.text();
        items = parseCSV(csv);
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

function renderTable(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');

        const itemCell = document.createElement('td');
        itemCell.className = 'item-cell';

        const img = document.createElement('img');
        img.src = `${IMAGE_PATH}${item.image}`;
        img.alt = item.name;
        img.className = 'item-image';
        img.onerror = function() {
            this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><rect width="24" height="24" fill="%232d3748"/><text x="12" y="16" font-family="Arial" font-size="12" fill="%2394a3b8" text-anchor="middle">?</text></svg>';
        };

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;

        itemCell.appendChild(img);
        itemCell.appendChild(nameSpan);

        const categoryCell = document.createElement('td');
        const categorySpan = document.createElement('span');
        categorySpan.textContent = item.category;
        categorySpan.className = 'category';
        categoryCell.appendChild(categorySpan);

        row.appendChild(itemCell);
        row.appendChild(categoryCell);

        tableBody.appendChild(row);
    });
}

function sortItems(sortBy) {
    if (currentSort === sortBy) {
        sortDirection *= -1;
    } else {
        currentSort = sortBy;
        sortDirection = 1;
    }

    items.sort((a, b) => {
        const valA = a[sortBy].toLowerCase();
        const valB = b[sortBy].toLowerCase();

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

function searchItems(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery)
    );
    renderTable(filtered);
}

function setupEventListeners() {
    document.getElementById('search').addEventListener('input', (e) => {
        searchItems(e.target.value);
    });

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            sortItems(th.dataset.sort);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
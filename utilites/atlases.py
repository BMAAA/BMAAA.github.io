from pathlib import Path
import csv
import json
import math

from PIL import Image

# ============================================================
# НАСТРОЙКИ
# ============================================================

# CSV-файл с предметами.
CSV_FILE = Path(
    "../data/items.csv"
)

# Папка, относительно которой будут искаться
# пути из столбца image.
PROJECT_DIRECTORY = Path(
    "../assets/textures"
)

# Папка для готовых атласов.
ATLAS_DIRECTORY = Path(
    "../assets/atlases"
)

# Путь к JSON с информацией об атласах.
ATLAS_JSON_FILE = Path(
    "../data/atlases/items_atlas.json"
)

# Размер одной ячейки атласа.
CELL_SIZE = 128

# Количество ячеек в одной строке.
COLUMNS = 32

# Отступ между ячейками.
PADDING = 0

# Формат готовых атласов.
ATLAS_FORMAT = "PNG"

KEEP_FULL_LAST_ROW = False


# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================

def get_safe_file_name(
        category: str
) -> str:
    """
    Создаёт безопасное имя файла
    на основе названия категории.
    """

    invalid_characters = (
        '<',
        '>',
        ':',
        '"',
        '/',
        '\\',
        '|',
        '?',
        '*'
    )

    file_name = category

    for character in invalid_characters:
        file_name = (
            file_name.replace(
                character,
                "_"
            )
        )

    return file_name


def get_texture_path(image_value: str) -> Path:
    image_path = Path(
        image_value
    )

    if image_path.is_absolute():
        return image_path

    return (PROJECT_DIRECTORY / image_path)


def load_texture(texture_path: Path) -> Image.Image:
    with Image.open(texture_path) as source_image:
        texture = (source_image.convert("RGBA").copy())

    return texture


def resize_texture(texture: Image.Image) -> Image.Image:
    if (texture.size == (CELL_SIZE, CELL_SIZE)):
        return texture

    return texture.resize((CELL_SIZE, CELL_SIZE), Image.Resampling.NEAREST)


# ============================================================
# ЧТЕНИЕ CSV
# ============================================================

def load_items() -> list[dict]:
    """
    Загружает предметы из CSV.
    """
    if not CSV_FILE.exists():
        raise FileNotFoundError(f"CSV-файл не найден:\n{CSV_FILE.resolve()}")

    items = []

    with CSV_FILE.open(mode="r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)

        required_columns = {
            "name",
            "image",
            "category"
        }

        actual_columns = set(reader.fieldnames or [])

        missing_columns = (required_columns - actual_columns)

        if missing_columns:
            missing_text = (", ".join(sorted(missing_columns)))

            raise ValueError(
                f"В CSV отсутствуют обязательные столбцы:\n{missing_text}"
            )

        for row_number, row in enumerate(reader, start=2):
            name = (row["name"] or "").strip()

            image = (row["image"] or "").strip()

            category = (row["category"] or "").strip()

            if not name:
                print(f"[ПРОПУСК] Строка {row_number}: пустое имя.")
                continue

            if not image:
                print(f"[ПРОПУСК] Строка {row_number}: у предмета {name} нет изображения.")
                continue

            if not category:
                print(f"[ПРОПУСК] Строка {row_number}: у предмета {name} нет категории.")
                continue

            items.append({
                "name": name,
                "image": image,
                "category": category
            })

    return items


# ============================================================
# ГРУППИРОВКА
# ============================================================

def group_items_by_category(items: list[dict]) -> dict[str, list[dict]]:
    categories = {}

    for item in items:
        category = (item["category"])
        if category not in categories:
            categories[category] = []

        categories[category].append(item)

    return categories


# ============================================================
# СОЗДАНИЕ ОДНОГО АТЛАСА
# ============================================================

def create_category_atlas(category: str, category_items: list[dict]) -> dict:
    item_count = len(category_items)
    rows = math.ceil(item_count / COLUMNS)

    if KEEP_FULL_LAST_ROW:
        atlas_rows = rows
    else:
        atlas_rows = max(rows, 1)

    cell_step = (CELL_SIZE + PADDING)

    atlas_width = (COLUMNS * cell_step - PADDING)

    atlas_height = (atlas_rows * cell_step - PADDING)

    atlas = Image.new("RGBA", (atlas_width, atlas_height), (0, 0, 0, 0))

    safe_category = (get_safe_file_name(category))

    atlas_file_name = (f"{safe_category}.png")

    atlas_path = (ATLAS_DIRECTORY / atlas_file_name)

    item_coordinates = {}

    print()
    print(f"Категория: {category}")
    print(f"Предметов: {item_count}")

    print(f"Размер атласа: {atlas_width}×{atlas_height}")

    for index, item in enumerate(category_items):
        column = (index % COLUMNS)
        row = (index // COLUMNS)

        x = (column * cell_step)
        y = (row * cell_step)

        texture_path = (get_texture_path(item["image"]))

        if not texture_path.exists():
            print(f"[ОШИБКА] Файл не найден:\n  {texture_path}\n    Предмет: {item['name']}")
            continue

        try:
            texture = (load_texture(texture_path))
            texture = (resize_texture(texture))


        except Exception as error:
            print(f"[ОШИБКА] Не удалось открыть:\n  {texture_path}\n    {error}")
            continue

        atlas.alpha_composite(texture, (x, y))

        item_coordinates[item["name"]] = {
            "category": category,
            "atlas": atlas_file_name,
            "column": column,
            "row":row,
            "x": x,
            "y": y
        }

    atlas.save(atlas_path, format=ATLAS_FORMAT, optimize=True)

    print(f"Создан:\n   {atlas_path}")

    return {
        "file": atlas_file_name,
        "width": atlas_width,
        "height": atlas_height,
        "cell_size": CELL_SIZE,
        "columns": COLUMNS,
        "rows": atlas_rows,
        "padding": PADDING,
        "items": item_coordinates
    }


# ============================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ============================================================

def generate_atlases() -> None:
    print("=" * 60)
    print("ГЕНЕРАЦИЯ АТЛАСОВ")
    print("=" * 60)

    ATLAS_DIRECTORY.mkdir(parents=True, exist_ok=True
    )

    ATLAS_JSON_FILE.parent.mkdir(parents=True, exist_ok=True)

    items = load_items()

    print()
    print(f"Всего предметов: {len(items)}")

    categories = (group_items_by_category(items))

    print(f"Категорий: {len(categories)}")

    atlas_data = {
        "version": 1,
        "cell_size": CELL_SIZE,
        "columns": COLUMNS,
        "padding": PADDING,
        "atlas_directory": "assets/atlases",
        "categories": {},
        "items": {}
    }

    for (category, category_items) in categories.items():
        category_data = (create_category_atlas(category, category_items))

        atlas_data["categories"][category] = \
            {
                key: value
                for key, value
                in category_data.items()
                if key != "items"
            }

        atlas_data["items"].update(category_data["items"])

    with ATLAS_JSON_FILE.open(mode="w", encoding="utf-8") as json_file:
        json.dump(atlas_data, json_file, ensure_ascii=False, indent=4)

    print()
    print("=" * 60)
    print("ГОТОВО")
    print("=" * 60)

    print(f"JSON:\n {ATLAS_JSON_FILE.resolve()}")


# ============================================================
# ЗАПУСК
# ============================================================

if __name__ == "__main__":
    generate_atlases()

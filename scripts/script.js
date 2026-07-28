function init() {
    var year = new Date().getFullYear() - 2006
    document.getElementById(
        "title"
    ).textContent =
        "Сейчас же модно иметь личные странички? Всмысле 2006 был " + (year) + " лет назад?!"

    console.log(year)
}
init();
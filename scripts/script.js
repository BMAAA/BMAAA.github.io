function init() {
    var year = new Date().getFullYear() - 2006
    document.getElementById(
        "title"
    ).textContent =
        "Сейчас же модно иметь личные странички? Всмысле 2006 был " + (year) + " лет назад?!"

    console.log(year)
}
init();


/* =========================================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
========================================================= */

const sidebar =
    document.getElementById(
        "sidebar"
    );


const menuButton =
    document.getElementById(
        "menuButton"
    );


const mobileOverlay =
    document.getElementById(
        "mobileOverlay"
    );


/* =========================================================
   МОБИЛЬНОЕ МЕНЮ
========================================================= */

function openMobileMenu() {

    sidebar.classList.add(
        "open"
    );


    mobileOverlay.classList.add(
        "visible"
    );

}


function closeMobileMenu() {

    sidebar.classList.remove(
        "open"
    );


    mobileOverlay.classList.remove(
        "visible"
    );

}


menuButton.addEventListener(
    "click",
    openMobileMenu
);


mobileOverlay.addEventListener(
    "click",
    closeMobileMenu
);


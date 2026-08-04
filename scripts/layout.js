function getPageKey() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path.endsWith("/index.html") || path.endsWith("index.html")) {
    return "registry";
  }
  if (path.includes("leather-color")) {
    return "leather";
  }
  if (path.includes("about")) {
    return "about";
  }
  return "registry";
}

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  const page = getPageKey();
  const lang = window.PplI18n.currentLanguage;
  sidebar.innerHTML = `
      <div class="sidebar-content">
        <div class="sidebar-brand">
          <a class="sidebar-logo-link" href="${window.PplBase.url("/")}">
            <img src="${window.PplBase.url("/favicon.ico")}" class="logo" alt="" />
          </a>
          <div class="sidebar-brand-text">
            <h1><a href="https://github.com/BMAAA/BMAAA.github.io">bmaaa.github.io</a></h1>
            <div id="title" class="sidebar-joke"></div>
          </div>
        </div>
        <nav class="navigation">
          <span class="navigation-title" data-i18n="lang_title"></span>
          <div class="language-switcher">
            <button class="language-button${lang === "ru_ru" ? " active" : ""}" type="button" data-language="ru_ru">Русский</button>
            <button class="language-button${lang === "en_us" ? " active" : ""}" type="button" data-language="en_us">English</button>
          </div>
          <span class="navigation-title"><b data-i18n="nav_title"></b></span>
          <ul>
            <li>
              <a href="${window.PplBase.url("/")}" class="${page === "registry" ? "active" : ""}"><b data-i18n="nav_registry"></b></a>
            </li>
            <li>
              <a href="${window.PplBase.url("/leather-color")}" class="${page === "leather" ? "active" : ""}"><b data-i18n="nav_leather"></b></a>
            </li>
            <li>
              <a href="${window.PplBase.url("/about")}" class="${page === "about" ? "active" : ""}"><b data-i18n="nav_about"></b></a>
            </li>
          </ul>
          <span class="navigation-title"><b data-i18n="projects_title"></b></span>
          <ul>
            <li>
              <a href="https://youtube.com/@tvppl24"><b>PEPELAND 24</b></a>
            </li>
            <li>
              <a href="https://discord.com/channels/447699225078136832/1483753248405065818"><b data-i18n="nav_label"></b></a>
            </li>
            <li>
              <a href="https://i.pinimg.com/originals/d6/54/20/d65420cd1a68f5320280380fcde43d97.jpg"><b data-i18n="nav_teaser"></b></a>
            </li>
          </ul>
        </nav>
      </div>
      <footer class="sidebar-footer">
        <p class="sidebar-footer-meta">bmaaa was here | <a href="https://github.com/BMAAA/BMAAA.github.io/issues" data-i18n="footer_bug"></a> | <a href="https://discord.com/channels/447699225078136832/1483753248405065818" data-i18n="footer_discord"></a></p>
        <div class="sidebar-footer-legal">
          <p data-i18n="footer_mojang"></p>
          <p class="ppl" data-i18n="footer_ppl"></p>
        </div>
      </footer>
  `;
  window.PplI18n.applyI18n(sidebar);
  sidebar.querySelectorAll(".language-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const next = button.dataset.language;
      if (!next || next === window.PplI18n.currentLanguage) return;
      await window.PplI18n.loadLanguage(next);
      location.reload();
    });
  });
}

function renderMobileMenuButton() {
  if (document.getElementById("menuButton")) return;
  const button = document.createElement("button");
  button.className = "menu-button";
  button.id = "menuButton";
  button.type = "button";
  button.setAttribute("data-i18n-aria", "aria_menu");
  button.setAttribute("aria-label", "Menu");
  button.innerHTML = "<span></span><span></span><span></span>";
  document.body.appendChild(button);
  window.PplI18n.applyI18n(button);
}

function bindMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  const menuButton = document.getElementById("menuButton");
  const mobileOverlay = document.getElementById("mobileOverlay");
  if (!sidebar || !menuButton || !mobileOverlay) return;

  function openMobileMenu() {
    sidebar.classList.add("open");
    mobileOverlay.classList.add("visible");
  }
  function closeMobileMenu() {
    sidebar.classList.remove("open");
    mobileOverlay.classList.remove("visible");
  }
  menuButton.addEventListener("click", openMobileMenu);
  mobileOverlay.addEventListener("click", closeMobileMenu);
  window.closeMobileMenu = closeMobileMenu;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(window.PplBase.url("/sw.js")).catch(() => {});
}

async function initLayout() {
  if (!window.PplI18n) return;
  try {
    await window.PplI18n.loadLanguage(window.PplI18n.currentLanguage);
  } catch (error) {
    console.error(error);
  }
  renderSidebar();
  renderMobileMenuButton();
  bindMobileMenu();
  window.PplI18n.applyI18n(document);
  registerServiceWorker();
  document.dispatchEvent(new CustomEvent("ppl:layout-ready"));
}

initLayout();

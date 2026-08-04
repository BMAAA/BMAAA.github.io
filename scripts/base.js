(function () {
  const ROOT = new Set([
    "index.html",
    "about",
    "about.html",
    "leather-color",
    "leather-color.html",
    "styles",
    "scripts",
    "data",
    "assets",
    "loc",
    "icons",
    "favicon.ico",
    "manifest.json",
    "sw.js",
  ]);

  function detectBase() {
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length === 0) return "";
    if (ROOT.has(parts[0])) return "";
    return "/" + parts[0];
  }

  const base = detectBase();

  function url(path) {
    if (!path) return base || "/";
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith("/") ? path : "/" + path;
    return base + normalized;
  }

  window.PplBase = { base, url };
})();

(() => {
  "use strict";

  const config = window.NAZERAK_SITE_CONFIG || {};
  const catalog = Object.freeze({
    home: "",
    forum: "forum",
    government: "pravitelstvo",
    court: "sud",
    prosecutor: "prokuratura",
    security: "fsb",
    military: "voennaya-baza",
    organizations: "organizatsii",
    about: "o-proekte"
  });

  const currentBasePath = () => {
    const path = window.location.pathname || "/";
    const marker = "/NazerakSites/";
    const index = path.indexOf(marker);
    if (index >= 0) return path.slice(0, index) + "/NazerakSites/";
    if (path === "/NazerakSites") return "/NazerakSites/";
    return "/";
  };

  const resolve = (keyOrSlug) => {
    const value = catalog[keyOrSlug] ?? keyOrSlug ?? "";
    const slug = String(value).replace(/^\/+|\/+$/g, "");
    return slug ? "/" + slug : "/";
  };

  const path = (keyOrSlug, options = {}) => {
    const clean = resolve(keyOrSlug);
    return (options.absolute ? (config.plannedOrigin || window.location.origin) : currentBasePath().replace(/\/$/,"")) + clean;
  };

  const url = (keyOrSlug, options = {}) => {
    const clean = resolve(keyOrSlug);
    const trailingSlash = options.trailingSlash !== false;
    const suffix = trailingSlash && clean !== "/" ? "/" : "";
    const origin = options.absolute ? (config.plannedOrigin || window.location.origin) : window.location.origin;
    const base = options.absolute ? "" : currentBasePath().replace(/\/$/,"");
    return origin + base + clean + suffix;
  };

  const forum = (routeSlug) => {
    const slug = String(routeSlug || "").replace(/^\/+|\/+$/g, "");
    return currentBasePath().replace(/\/$/,"") + "/forum-category.html?slug=" + encodeURIComponent(slug);
  };

  window.NaZerakRoutes = Object.freeze({
    catalog,
    path,
    url,
    forum
  });
})();
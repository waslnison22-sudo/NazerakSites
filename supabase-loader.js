(() => {
  "use strict";

  const VERSION = "2.117.2";
  const SOURCES = [
    `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${VERSION}/dist/umd/supabase.js`,
    `https://unpkg.com/@supabase/supabase-js@${VERSION}/dist/umd/supabase.js`
  ];

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error("Таймаут загрузки " + src));
    }, 4000);

    script.src = src;
    script.async = false;
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve(src);
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("Не удалось загрузить " + src));
    };
    document.head.appendChild(script);
  });

  window.NAZERAK_SUPABASE_READY = (async () => {
    if (typeof window.supabase?.createClient === "function") {
      return { source: "preloaded", version: VERSION };
    }

    const errors = [];

    for (const source of SOURCES) {
      try {
        await loadScript(source);

        if (typeof window.supabase?.createClient === "function") {
          return { source, version: VERSION };
        }

        errors.push(source + ": global createClient not found");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const detail = errors.filter(Boolean).join("; ");
    throw new Error("Supabase SDK не загрузился." + (detail ? " " + detail : ""));
  })();
})();

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);

const routeToFile = (pathname) => {
  if (pathname === "/" || pathname === "") return "index.html";
  if (pathname === "/forum" || pathname === "/forum/") return "forum.html";
  if (/^\/forum\/topic\/[^/]+\/?$/i.test(pathname)) return "topic.html";
  if (/^\/forum\/[^/]+\/?$/i.test(pathname)) return "forum-category.html";
  if (pathname === "/members" || pathname === "/members/") return "forum-members.html";
  if (pathname === "/search" || pathname === "/search/") return "forum-search.html";
  if (/^\/user\/[^/]+\/?$/i.test(pathname)) return "forum-user.html";
  if (pathname === "/cabinet" || pathname === "/cabinet/") return "cabinet.html";
  return null;
};

const contentType = (file) => {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
  })[ext] || "application/octet-stream";
};

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    const mapped = routeToFile(requestUrl.pathname);
    let relativePath = mapped || decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    relativePath = relativePath.replace(/^\.\.(?:[\\/]|$)/, "");
    const filePath = path.resolve(root, relativePath);

    if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root, relativePath)) {
      res.writeHead(400);
      res.end("Bad path");
      return;
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const body = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    if (req.method === "HEAD") {
      res.end();
    } else {
      res.end(body);
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("NaZerak QA server listening on http://127.0.0.1:" + port);
});

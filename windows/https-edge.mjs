// ورودی HTTPS کم‌وابستگی برای آزمایش محلی؛ جایگزین وب‌سرور سخت‌سازی‌شدهٔ عمومی نیست.
import https from "node:https";
import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = await realpath(
  fileURLToPath(new URL("../public/", import.meta.url)),
);
const origin = new URL(process.env.APP_ORIGIN);
if (origin.protocol !== "https:") throw Error("APP_ORIGIN باید HTTPS باشد.");
const port = Number(origin.port || 443);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const server = https.createServer(
  {
    pfx: await readFile(process.env.HTTPS_PFX),
    passphrase: process.env.HTTPS_PFX_PASSWORD,
    minVersion: "TLSv1.2",
  },
  async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Cache-Control", "no-store");
    if (req.headers.host?.toLowerCase() !== origin.host.toLowerCase()) {
      res.writeHead(421);
      res.end("نشانی نامعتبر است.");
      return;
    }
    if (req.url.startsWith("/api/")) {
      const headers = { ...req.headers, "x-real-ip": req.socket.remoteAddress };
      for (const key of [
        "connection",
        "proxy-connection",
        "keep-alive",
        "transfer-encoding",
        "upgrade",
        "te",
        "trailer",
        "forwarded",
        "x-forwarded-for",
        "x-forwarded-host",
        "x-forwarded-proto",
      ])
        delete headers[key];
      const upstream = http.request(
        {
          host: "127.0.0.1",
          port: Number(process.env.PORT || 3000),
          method: req.method,
          path: req.url,
          headers,
        },
        (reply) => {
          const out = { ...reply.headers };
          delete out.connection;
          delete out["transfer-encoding"];
          res.writeHead(reply.statusCode, out);
          reply.pipe(res);
        },
      );
      upstream.setTimeout(30000, () => upstream.destroy());
      upstream.on("error", () => {
        if (!res.headersSent) res.writeHead(502);
        res.end("سرویس در دسترس نیست.");
      });
      req.on("aborted", () => upstream.destroy());
      req.pipe(upstream);
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      let name = decodeURIComponent(req.url.split("?")[0]);
      if (name === "/") name = "/index.html";
      if (
        name.includes("\\") ||
        name.includes("\0") ||
        name.split("/").some((p) => p.startsWith("."))
      )
        throw Error();
      const file = await realpath(path.resolve(root, "." + name));
      if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile())
        throw Error();
      const type = mime[path.extname(file)];
      if (!type) throw Error();
      res.writeHead(200, { "Content-Type": type });
      if (req.method === "HEAD") res.end();
      else {
        const stream = createReadStream(file);
        stream.on("error", () => res.destroy());
        stream.pipe(res);
      }
    } catch {
      res.writeHead(404);
      res.end("فایل یافت نشد.");
    }
  },
);
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.on("error", (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
server.listen(port, process.env.EDGE_HOST || "127.0.0.1", () =>
  console.log(`سامانه: ${origin.origin}`),
);

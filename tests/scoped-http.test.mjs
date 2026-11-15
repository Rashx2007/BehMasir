import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { fork } from "node:child_process";
function message(child, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(Error("fixture timeout")), 10000);
    function done(err) {
      clearTimeout(timer);
      child.off("message", onMessage);
      child.off("exit", onExit);
      err ? reject(err) : resolve();
    }
    function onMessage(m) {
      if (m.type === type) done();
    }
    function onExit() {
      done(Error("fixture exited"));
    }
    child.on("message", onMessage);
    child.once("exit", onExit);
  });
}
test(
  "real HTTP server applies scoped reads and route denials with mock DB/session (not live authentication)",
  { timeout: 20000 },
  async (t) => {
    const reservation = net.createServer();
    await new Promise((r) => reservation.listen(0, "127.0.0.1", r));
    const port = reservation.address().port;
    await new Promise((r) => reservation.close(r));
    const child = fork(
      new URL("./scoped-http-worker.mjs", import.meta.url),
      [],
      {
        execArgv: [],
        env: {
          ...process.env,
          APP_ORIGIN: "https://localhost:8444",
          PORT: String(port),
          SESSION_COOKIE_NAME: "__Host-behmasir-scoped-fixture",
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    let output = "";
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (output += b));
    t.after(() => {
      child.kill();
    });
    await message(child, "ready");
    const read = async (path, method = "GET", headers = {}) => {
      const r = await fetch(`http://127.0.0.1:${port}/api/${path}`, {
        method,
        headers: {
          cookie: "__Host-behmasir-scoped-fixture=" + "b".repeat(64),
          ...headers,
        },
        ...(method === "GET" ? {} : { body: "{}" }),
      });
      return { status: r.status, headers: r.headers, data: await r.json() };
    };
    const patch = async (value) => {
      const wait = message(child, "patched");
      child.send({ type: "patch", ...value });
      await wait;
    };
    let r = await read("state?revision=40");
    assert.equal(r.status, 200, output);
    assert.equal(r.data.unchanged, undefined);
    assert.equal(r.data.scopedReadVersion, 1);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.data.currentUser.role, "unit_manager");
    assert(!JSON.stringify(r.data).includes("OUTSIDE_CANARY"));
    assert(!JSON.stringify(r.data).includes("SECRET_HASH"));
    assert.equal(r.data.scopeReport.total, 4);
    assert.deepEqual(r.data.vehicles, []);
    r = await read("history?before=999");
    assert.equal(r.status, 200);
    assert.deepEqual(
      r.data.items.map((x) => x.id),
      [108],
    );
    r = await read("unit-reports");
    assert.equal(r.status, 200);
    assert.equal(r.data.report.total, 4);
    for (const [path, method] of [
      ["users", "POST"],
      ["units", "POST"],
      ["units/1/name", "PUT"],
      ["requests", "POST"],
      ["requests/1", "DELETE"],
      ["vehicles/deleted", "GET"],
      ["vehicles/1/emergency-preview", "GET"],
      ["vehicles/1/emergency", "POST"],
      ["unknown", "GET"],
    ])
      assert.equal((await read(path, method)).status, 403, path);
    assert.equal(
      (await read("preferences", "PUT")).status,
      403,
      "own preferences still require CSRF and origin",
    );
    assert.equal(
      (await read("password", "POST")).status,
      403,
      "password still requires CSRF and origin",
    );
    await patch({ permissions: ["reports.read"] });
    r = await read("state?revision=40");
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.samples, []);
    assert.equal(r.data.scopeReport.total, 4);
    assert.equal((await read("history?before=999")).status, 403);
    await patch({ assignments: [] });
    r = await read("state?revision=40");
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.currentUser.access.unitIds, []);
    assert.equal(r.data.scopeReport.total, 0);
    await patch({ role: "unsupported" });
    assert.equal((await read("state")).status, 403);
    assert(!output.includes("UNEXPECTED_WRITE"));
  },
);

import test from "node:test";
import assert from "node:assert/strict";
import {
  transactionWithHistory,
  setHistoryActor,
  assertHistorySchema,
} from "../backend/history-context.mjs";

function fixture(failAt = "") {
  const calls = [];
  let clears = 0;
  const db = {
    async query(sql) {
      calls.push(sql);
      if (
        sql.includes("actor_id = NULL") &&
        ++clears === 2 &&
        failAt === "clear"
      )
        throw Error("cleanup");
    },
    async execute(sql, args) {
      calls.push([sql, args]);
    },
    async beginTransaction() {
      calls.push("begin");
    },
    async commit() {
      calls.push("commit");
      if (failAt === "commit") throw Error("commit");
    },
    async rollback() {
      calls.push("rollback");
      if (failAt === "rollback") throw Error("rollback");
    },
    release() {
      calls.push("release");
    },
    destroy() {
      calls.push("destroy");
    },
  };
  return {
    db,
    calls,
    pool: {
      async getConnection() {
        return db;
      },
    },
  };
}
test("transaction clears pooled identity before work and after commit", async () => {
  const f = fixture();
  const result = await transactionWithHistory(f.pool, async (db) => {
    await setHistoryActor(db, 1);
    return 7;
  });
  assert.equal(result, 7);
  assert.match(f.calls[0], /actor_id = NULL/);
  assert.equal(f.calls.at(-1), "release");
  assert.match(f.calls.at(-2), /actor_id = NULL/);
  assert.equal(
    f.calls.filter(
      (x) => typeof x === "string" && x.includes("actor_id = NULL"),
    ).length,
    2,
  );
  assert(
    f.calls.find(
      (x) =>
        Array.isArray(x) &&
        x[0].includes("change_id = ?") &&
        /^[0-9a-f-]{36}$/.test(x[1][0]),
    ),
  );
  assert(f.calls.find((x) => Array.isArray(x) && x[0].includes("FOR UPDATE")));
  assert(f.calls.indexOf("commit") > f.calls.indexOf("begin"));
});
test("failure rolls back business changes and releases a clean connection", async () => {
  const f = fixture();
  const original = Error("business");
  await assert.rejects(
    transactionWithHistory(f.pool, async () => {
      throw original;
    }),
    (e) => e === original,
  );
  assert(f.calls.includes("rollback"));
  assert(!f.calls.includes("commit"));
  assert.equal(f.calls.at(-1), "release");
});
test("failed identity cleanup destroys rather than reuses connection", async () => {
  const f = fixture("clear");
  await transactionWithHistory(f.pool, async () => 1);
  assert.equal(f.calls.at(-1), "destroy");
  assert(!f.calls.includes("release"));
});
test("rollback failure destroys connection without hiding business error", async () => {
  const f = fixture("rollback");
  const original = Error("business");
  await assert.rejects(
    transactionWithHistory(f.pool, async () => {
      throw original;
    }),
    (e) => e === original,
  );
  assert.equal(f.calls.at(-1), "destroy");
});
test("commit failure does not return success", async () => {
  const f = fixture("commit");
  await assert.rejects(
    transactionWithHistory(f.pool, async () => 1),
    /commit/,
  );
  assert(f.calls.includes("rollback"));
});
test("actor ids are bound parameters; malformed actors are rejected", async () => {
  const f = fixture();
  for (const id of [null, 0, -1, "1", 1.5, NaN])
    await assert.rejects(setHistoryActor(f.db, id));
  assert.equal(f.calls.length, 0);
  await setHistoryActor(f.db, 12);
  assert.deepEqual(f.calls[0], ["SET @behmasir_actor_id = ?", [12]]);
});
test("schema guard rejects missing, old and invalid markers", async () => {
  for (const version of [null, undefined, 1, 2, "bad"]) {
    await assert.rejects(
      assertHistorySchema({
        async execute() {
          return [[{ version }]];
        },
      }),
    );
  }
});
test("schema guard validates physical tracking columns for all seven tables", async () => {
  const calls = [];
  await assertHistorySchema({
    async execute(sql) {
      calls.push(sql);
      return [[{ version: 3 }]];
    },
  });
  assert.equal(calls.length, 8);
  assert(calls.slice(1).every((x) => x.includes("created_at, edited_at")));
});

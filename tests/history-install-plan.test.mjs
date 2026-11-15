import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  expectedHistoryColumns,
  validateResumeRoleColumns,
  historyStartIndex,
} from "../backend/history-install-plan.mjs";

const spec = JSON.parse(
  await readFile(
    new URL("../sql/003_history_spec_TEST_ONLY.json", import.meta.url),
  ),
);
const sql = await readFile(
  new URL("../sql/003_history_foundation_TEST_ONLY.sql", import.meta.url),
  "utf8",
);
const statements = sql
  .split(/\r?\n-- @statement\r?\n/)
  .slice(1)
  .map((s) => s.trim());
const roleColumns = [
  {
    COLUMN_NAME: "version",
    COLUMN_TYPE: "int unsigned",
    IS_NULLABLE: "NO",
    COLUMN_DEFAULT: "1",
    EXTRA: "",
  },
  {
    COLUMN_NAME: "created_at",
    COLUMN_TYPE: "datetime(3)",
    IS_NULLABLE: "YES",
    COLUMN_DEFAULT: null,
    EXTRA: "",
  },
  {
    COLUMN_NAME: "edited_at",
    COLUMN_TYPE: "datetime(3)",
    IS_NULLABLE: "YES",
    COLUMN_DEFAULT: null,
    EXTRA: "",
  },
];
test("fresh mode starts at zero; explicit resume starts at step two", () => {
  assert.equal(historyStartIndex(statements, []), 0);
  assert.equal(historyStartIndex(statements, ["--resume-after-step-1"]), 1);
  assert.throws(() => historyStartIndex(statements, ["--force"]));
  assert.throws(() =>
    historyStartIndex(statements, ["--resume-after-step-1", "--force"]),
  );
});
test("resume rejects an old SQL file or a different statement plan", () => {
  const old = [...statements];
  old[1] =
    "ALTER TABLE roles ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP(3)";
  assert.throws(() => historyStartIndex(old, ["--resume-after-step-1"]));
  assert.throws(() => historyStartIndex(statements.slice(1), []));
});
test("resume permits only the three known extra role columns", () => {
  assert.deepEqual(expectedHistoryColumns(spec, "roles", false), [
    "code",
    "title",
  ]);
  assert.deepEqual(expectedHistoryColumns(spec, "roles", true), [
    "code",
    "created_at",
    "edited_at",
    "title",
    "version",
  ]);
  for (const table of Object.keys(spec.tables).filter((t) => t !== "roles")) {
    assert.deepEqual(
      expectedHistoryColumns(spec, table, true),
      expectedHistoryColumns(spec, table, false),
    );
  }
});
test("resume requires exact partial column types, nullability and defaults", () => {
  validateResumeRoleColumns(roleColumns);
  for (const [index, key, value] of [
    [0, "COLUMN_TYPE", "int"],
    [0, "COLUMN_DEFAULT", "2"],
    [1, "COLUMN_DEFAULT", "CURRENT_TIMESTAMP(3)"],
    [1, "IS_NULLABLE", "NO"],
    [2, "COLUMN_TYPE", "datetime"],
    [2, "EXTRA", "VIRTUAL GENERATED"],
  ]) {
    const changed = structuredClone(roleColumns);
    changed[index][key] = value;
    assert.throws(() => validateResumeRoleColumns(changed));
  }
  assert.throws(() => validateResumeRoleColumns(roleColumns.slice(1)));
});
test("fixed default uses full MODIFY COLUMN without changing historical values", () => {
  assert.equal(
    statements[1],
    "ALTER TABLE roles MODIFY COLUMN created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)",
  );
  assert.doesNotMatch(sql, /UPDATE roles SET created_at/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
test("private PowerShell entry point uses masked confirmation and sends secrets only on stdin", async () => {
  const s = await read("windows/create-test-managers.ps1");
  assert.match(s, /Read-Host \$Label -AsSecureString/);
  assert.match(s, /ZeroFreeBSTR/);
  assert.match(s, /\$Support -cne \$Again/);
  assert.match(s, /\$Office -cne \$Again/);
  assert.match(s, /\$InputJson \| & node "--env-file=\$EnvFile"/);
  assert.doesNotMatch(
    s,
    /Set-ExecutionPolicy|Bypass|Write-(?:Host|Output) \$(?:Support|Office|InputJson)|Set-Content|Out-File|--password=/,
  );
});
test("creation runner has no password argv, secret logs, role grants, DDL or direct live DB fallback", async () => {
  const s = await read("backend/create-test-managers.mjs");
  assert.match(s, /process.argv.length !== 2/);
  assert.match(s, /process.stdin/);
  assert.match(s, /await requireManagerEnvironment/);
  assert.match(s, /transactionWithHistory/);
  assert.doesNotMatch(
    s,
    /console\.(?:log|error)\((?:e|payload|hashes)\)|GRANT |CREATE USER|ALTER TABLE|DROP |TRUNCATE/,
  );
  assert.match(s, /Do NOT rerun/);
});
test("environment preflight checks branch, exact runtime, fresh matching backup and stopped ports without TRIGGER metadata grant", async () => {
  const s = await read("backend/test-manager-environment.mjs");
  assert.match(s, /feature\/org-workflow-audit/);
  assert.match(s, /EXPECTED_SCOPED_RUNTIME_FILES_REQUIRED/);
  assert.match(s, /before-scoped-test-accounts-/);
  assert.match(s, /Database:/);
  assert.match(s, /Dump completed on/);
  assert.match(s, /86400000/);
  assert.match(s, /await occupied\(3002\)/);
  assert.match(s, /await occupied\(8444\)/);
  assert.doesNotMatch(s, /FROM information_schema.TRIGGERS|GRANT TRIGGER/);
  assert.match(s, /engine !== "InnoDB"/);
});
test("all required runtime fingerprints match installed source and tolerate CRLF-only conversion", async () => {
  const plan = JSON.parse(await read("backend/test-manager-runtime.json"));
  assert.equal(Object.keys(plan).length, 11);
  for (const [file, sha] of Object.entries(plan)) {
    const text = await read(file);
    assert.equal(
      createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex"),
      sha,
      file,
    );
    assert.equal(
      createHash("sha256")
        .update(text.replace(/\r?\n/g, "\r\n").replace(/\r\n/g, "\n"))
        .digest("hex"),
      sha,
      file,
    );
  }
});
test("MySQL acceptance provisions in transaction and deliberately rolls all changes back", async () => {
  const s = await read("backend/verify-test-managers.mjs");
  assert.match(s, /await requireManagerEnvironment/);
  assert.match(s, /transactionWithHistory/);
  assert.match(s, /throw rollback/);
  assert.match(s, /if \(e !== rollback\) throw e/);
  assert.match(s, /await pool.end\(\)/);
  assert.match(s, /no persistent test accounts created/);
  assert.doesNotMatch(s, /TRUNCATE|DROP TABLE|console\.error\(e\)/);
});
test("new-role request guide is read-only and role label comes from the safe server profile", async () => {
  const s = await read("public/app.js");
  assert.match(s, /function sectionGuideInfo\(tab\)/);
  assert.match(
    s,
    /currentUser\?\.role === "unit_manager" && tab === "requests"/,
  );
  assert.match(s, /const info = sectionGuideInfo\(tab\)/);
  assert.match(s, /currentUser.roleTitle \|\| ROLE_LABELS\[currentUser.role\]/);
});

import { createHash } from "node:crypto";
export const ACCESS_TABLES = Object.freeze([
  "access_permissions",
  "access_role_permissions",
  "unit_role_assignments",
]);
export const ACCESS_TRIGGERS = Object.freeze(
  ["ap", "ura"]
    .flatMap((p) =>
      ["bi", "bu", "bd", "ai", "au"].map((s) => "bh4_" + p + "_" + s),
    )
    .concat(["bh4_arp_bu", "bh4_arp_ai", "bh4_arp_ad"]),
);
export function accessStatements(sql, spec) {
  if (
    spec.schema_version !== 4 ||
    createHash("sha256").update(sql).digest("hex") !== spec.sql_sha256
  )
    throw Error("ACCESS_SQL_HASH_MISMATCH");
  if (
    spec.role?.code !== "unit_manager" ||
    typeof spec.role.title !== "string" ||
    !spec.role.title.trim() ||
    [...spec.role.title].length > 80 ||
    !Array.isArray(spec.permissions) ||
    spec.permissions.length !== 2 ||
    JSON.stringify(spec.permissions.map((p) => p.code).sort()) !==
      JSON.stringify(["reports.read", "requests.read"]) ||
    spec.permissions.some(
      (p) =>
        typeof p.title !== "string" ||
        !p.title.trim() ||
        [...p.title].length > 100,
    )
  )
    throw Error("ACCESS_CATALOG_MISMATCH");
  const statements = sql
    .split(/\r?\n-- @statement\r?\n/)
    .slice(1)
    .map((s) => s.trim());
  const names = statements
    .slice(3)
    .map((s) => s.match(/^CREATE TRIGGER `([^`]+)`/i)?.[1])
    .sort();
  if (
    statements.length !== 16 ||
    spec.statement_count !== 16 ||
    ACCESS_TABLES.some(
      (t, i) => !statements[i].startsWith("CREATE TABLE " + t + " ("),
    ) ||
    JSON.stringify(names) !== JSON.stringify([...ACCESS_TRIGGERS].sort()) ||
    JSON.stringify([...spec.triggers].sort()) !==
      JSON.stringify([...ACCESS_TRIGGERS].sort()) ||
    JSON.stringify(Object.keys(spec.tables).sort()) !==
      JSON.stringify([...ACCESS_TABLES].sort())
  )
    throw Error("ACCESS_PLAN_MISMATCH");
  return statements;
}
export function requireFreshAccessState(
  versions,
  tableNames,
  triggerNames,
  roleCount,
) {
  if (versions.map(Number).join(",") !== "1,2,3")
    throw Error("EXPECTED_SCHEMA_1_2_3_ONLY");
  if (tableNames.length || triggerNames.length || Number(roleCount) !== 0)
    throw Error("PREVIOUS_OR_PARTIAL_ACCESS_INSTALLATION");
}

// Pure preflight helpers; no database connections or mutations.
export function expectedHistoryColumns(spec, table, resumeAfterStep1) {
  return spec.tables[table]
    .filter((column) => {
      if (resumeAfterStep1 && table === "roles") return true;
      return (
        !(column === "edited_at" && table !== "vehicle_types") &&
        !(table === "roles" && ["created_at", "version"].includes(column)) &&
        !(table === "units" && column === "version")
      );
    })
    .sort();
}

export function validateResumeRoleColumns(columns) {
  const expected = {
    version: ["int unsigned", "NO", "1"],
    created_at: ["datetime(3)", "YES", null],
    edited_at: ["datetime(3)", "YES", null],
  };
  for (const [name, definition] of Object.entries(expected)) {
    const row = columns.find((column) => column.COLUMN_NAME === name);
    if (
      !row ||
      row.COLUMN_TYPE !== definition[0] ||
      row.IS_NULLABLE !== definition[1] ||
      row.COLUMN_DEFAULT !== definition[2] ||
      row.EXTRA !== ""
    ) {
      throw new Error("RESUME_ROLE_DEFINITION_MISMATCH");
    }
  }
}

export function historyStartIndex(statements, args) {
  if (
    args.length > 1 ||
    (args.length === 1 && args[0] !== "--resume-after-step-1")
  ) {
    throw new Error("UNKNOWN_INSTALL_MODE");
  }
  if (
    statements.length !== 60 ||
    !statements[0].startsWith("ALTER TABLE roles ADD COLUMN version ") ||
    statements[1] !==
      "ALTER TABLE roles MODIFY COLUMN created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)"
  ) {
    throw new Error("MIGRATION_FILE_MISMATCH");
  }
  return args.length ? 1 : 0;
}

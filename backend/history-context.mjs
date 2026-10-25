import { randomUUID } from "node:crypto";

const clearContext =
  "SET @behmasir_actor_id = NULL, @behmasir_change_id = NULL";

export async function setHistoryActor(db, actorId) {
  if (!Number.isSafeInteger(actorId) || actorId <= 0) {
    throw new Error("Invalid history actor.");
  }
  await db.execute("SET @behmasir_actor_id = ?", [actorId]);
}

// Session variables survive a transaction: clear them before AND after use.
// Destroy, rather than return, a pooled connection when cleanup fails.
export async function transactionWithHistory(pool, work) {
  const db = await pool.getConnection();
  let usable = true;
  try {
    await db.query(clearContext);
    await db.query("SET time_zone='+00:00'");
    await db.execute("SET @behmasir_change_id = ?", [randomUUID()]);
    await db.beginTransaction();
    await db.execute("SELECT revision FROM app_meta WHERE id=1 FOR UPDATE");
    const result = await work(db);
    await db.execute("UPDATE app_meta SET revision=revision+1 WHERE id=1");
    await db.commit();
    return result;
  } catch (error) {
    try {
      await db.rollback();
    } catch {
      usable = false;
    }
    throw error;
  } finally {
    if (usable) {
      try {
        await db.query(clearContext);
      } catch {
        usable = false;
      }
    }
    if (usable) db.release();
    else db.destroy();
  }
}

export async function assertHistorySchema(db) {
  const [versions] = await db.execute(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  if (
    !Number.isFinite(Number(versions[0]?.version)) ||
    Number(versions[0]?.version) < 3
  ) {
    throw new Error("History foundation requires test schema version 3.");
  }
  // A schema marker alone is insufficient; check the required columns too.
  for (const table of [
    "users",
    "units",
    "centers",
    "vehicles",
    "vehicle_types",
    "roles",
    "transport_requests",
  ]) {
    await db.execute(
      `SELECT version, created_at, edited_at FROM ${table} LIMIT 0`,
    );
  }
}

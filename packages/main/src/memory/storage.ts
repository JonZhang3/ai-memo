import SQLite3 from "better-sqlite3";
import { v4 as uuid } from "uuid";
import { isEqual } from "radashi";
import { getPacificTime } from "../utils";
import type { MemoryHistory } from "../types";

const HISTORY_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  memory_id TEXT,
  old_memory TEXT,
  new_memory TEXT,
  new_value TEXT,
  event TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  is_deleted INTEGER
)
`;
const MIGRATE_HISTORY_TABLE_SQL = `
INSERT INTO history (id, memory_id, old_memory, new_memory, new_value, event, created_at, updated_at, is_deleted)
SELECT id, memory_id, prev_value, new_value, new_value, event, timestamp, timestamp, is_deleted
FROM old_history
`;

export class SQLiteManager {
  private db: SQLite3.Database;

  constructor(path: string = ":memory:") {
    this.db = new SQLite3(path);
    this.migrateHistoryTable();
    this.createHistoryTable();
  }

  addHistory({
    memoryId,
    oldMemory,
    newMemory,
    event,
    createdAt,
    updatedAt,
    isDeleted = false,
  }: Omit<MemoryHistory, "id">) {
    const stmt = this.db.prepare(
      `INSERT INTO history (id, memory_id, old_memory, new_memory, event, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const time = createdAt ?? getPacificTime();
    stmt.run(
      uuid(),
      memoryId,
      oldMemory,
      newMemory,
      event,
      time,
      updatedAt ?? time,
      isDeleted ? 1 : 0,
    );
  }

  getHistory(memoryId: string): MemoryHistory[] {
    const stmt = this.db.prepare(`
      SELECT id, memory_id, old_memory, new_memory, event, created_at, updated_at
      FROM history
      WHERE memory_id = ?
      ORDER BY updated_at ASC
    `);
    const result: MemoryHistory[] = [];
    stmt.all(memoryId).forEach((row: any) => {
      result.push({
        id: row.id,
        memoryId: row.memory_id,
        oldMemory: row.old_memory,
        newMemory: row.new_memory,
        event: row.event,
        createdAt: row.created_at
          ? getPacificTime(new Date(row.created_at))
          : undefined,
        updatedAt: row.updated_at
          ? getPacificTime(new Date(row.updated_at))
          : undefined,
      });
    });
    return result;
  }

  reset() {
    this.db.exec("DROP TABLE IF EXISTS history");
    this.createHistoryTable();
  }

  private migrateHistoryTable() {
    this.db.transaction(() => {
      const tbExists = this.db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='history'`,
        )
        .get();
      if (tbExists) {
        const currentSchemaRows = this.db
          .prepare("PRAGMA table_info(history)")
          .all();
        const currentSchema = currentSchemaRows.reduce(
          (acc: Record<string, string>, row: any) => {
            acc[row.name] = row.type;
            return acc;
          },
          {} as Record<string, string>,
        );
        const expectedSchema: Record<string, string> = {
          id: "TEXT",
          memory_id: "TEXT",
          old_memory: "TEXT",
          new_memory: "TEXT",
          new_value: "TEXT",
          event: "TEXT",
          created_at: "DATETIME",
          updated_at: "DATETIME",
          is_deleted: "INTEGER",
        };
        if (!isEqual(currentSchema, expectedSchema)) {
          this.db.prepare("ALTER TABLE history RENAME TO old_history").run();
          this.db.prepare(HISTORY_TABLE_SCHEMA).run();
          this.db.prepare(MIGRATE_HISTORY_TABLE_SQL).run();
          this.db.prepare("DROP TABLE old_history").run();
        }
      }
    })();
  }

  private createHistoryTable() {
    this.db.prepare(HISTORY_TABLE_SCHEMA).run();
  }
}

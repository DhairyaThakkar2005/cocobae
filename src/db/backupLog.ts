import { getDB } from "./schema";

export interface BackupLogEntry {
  id: number;
  backed_up_at: string;
  file_path: string;
  trigger_type: "auto" | "manual";
  status: "success" | "failed";
}

export async function logBackup(
  filePath: string,
  triggerType: "auto" | "manual",
  status: "success" | "failed",
): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const sql = `INSERT INTO backup_log (backed_up_at, file_path, trigger_type, status) VALUES (?, ?, ?, ?)`;

  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [now, filePath, triggerType, status]);
    return;
  }

  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [now, filePath, triggerType, status],
        () => resolve(),
        () => resolve(),
      );
    });
  });
}

export async function getBackupLogs(limit = 20): Promise<BackupLogEntry[]> {
  const db = await getDB();
  const sql = `SELECT * FROM backup_log ORDER BY id DESC LIMIT ?`;

  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql, [limit]);
  }

  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [limit],
        (_: any, res: any) => {
          const rows: BackupLogEntry[] = [];
          for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
          resolve(rows);
        },
        () => resolve([]),
      );
    });
  });
}

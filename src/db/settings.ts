import { getDB } from "./schema";

export async function getSetting(
  key: string,
  defaultValue = "",
): Promise<string> {
  const db = await getDB();
  const sql = `SELECT value FROM settings WHERE key = ?`;

  try {
    if (typeof db.getAllAsync === "function") {
      const rows = await db.getAllAsync(sql, [key]);
      return rows[0]?.value ?? defaultValue;
    }

    return new Promise((resolve) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          [key],
          (_: any, result: any) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0).value);
            } else {
              resolve(defaultValue);
            }
          },
          () => resolve(defaultValue),
        );
      });
    });
  } catch (e) {
    return defaultValue;
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDB();
  const sql = `SELECT * FROM settings`;
  const result: Record<string, string> = {};

  try {
    if (typeof db.getAllAsync === "function") {
      const rows = await db.getAllAsync(sql);
      rows.forEach((r: any) => {
        result[r.key] = r.value;
      });
      return result;
    }

    return new Promise((resolve) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          [],
          (_: any, res: any) => {
            for (let i = 0; i < res.rows.length; i++) {
              const item = res.rows.item(i);
              result[item.key] = item.value;
            }
            resolve(result);
          },
          () => resolve(result),
        );
      });
    });
  } catch (e) {
    return result;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  const sql = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;

  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [key, value]);
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [key, value],
        () => resolve(),
        (_: any, err: any) => reject(err),
      );
    });
  });
}

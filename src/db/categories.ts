import { getDB } from "./schema";

export interface Category {
  id: number;
  name: string;
  emoji: string;
  grad_from: string;
  grad_to: string;
  sort_order: number;
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  const sql = `SELECT * FROM categories ORDER BY sort_order ASC, id ASC`;

  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql);
  }

  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [],
        (_: any, result: any) => {
          const rows: Category[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          resolve(rows);
        },
        () => resolve([]),
      );
    });
  });
}

export async function addCategory(
  category: Omit<Category, "id">,
): Promise<number> {
  const db = await getDB();
  const sql = `INSERT INTO categories (name, emoji, grad_from, grad_to, sort_order) VALUES (?, ?, ?, ?, ?)`;
  const params = [
    category.name,
    category.emoji || "🍨",
    category.grad_from || "#FF6B6B",
    category.grad_to || "#FFE66D",
    category.sort_order ?? 0,
  ];

  if (typeof db.runAsync === "function") {
    const res = await db.runAsync(sql, params);
    return res.lastInsertRowId;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        params,
        (_: any, res: any) => {
          resolve(res.insertId);
        },
        (_: any, err: any) => reject(err),
      );
    });
  });
}

export async function updateCategory(
  id: number,
  category: Partial<Category>,
): Promise<void> {
  const db = await getDB();
  const sql = `UPDATE categories SET name = ?, emoji = ?, grad_from = ?, grad_to = ? WHERE id = ?`;
  const params = [
    category.name,
    category.emoji,
    category.grad_from,
    category.grad_to,
    id,
  ];

  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, params);
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        params,
        () => resolve(),
        (_: any, err: any) => reject(err),
      );
    });
  });
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDB();
  const sql = `DELETE FROM categories WHERE id = ?`;

  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [id]);
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [id],
        () => resolve(),
        (_: any, err: any) => reject(err),
      );
    });
  });
}

import { getDB } from "./schema";

export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  min_alert_stock: number;
  cost_per_unit: number;
  updated_at?: string;
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const db = await getDB();
  const sql = `SELECT * FROM inventory_items ORDER BY current_stock ASC`;
  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql);
  }
  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [],
        (_: any, result: any) => {
          const rows: InventoryItem[] = [];
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

export async function updateStock(id: number, delta: number): Promise<void> {
  const db = await getDB();
  const sql = `UPDATE inventory_items SET current_stock = MAX(0, current_stock + ?), updated_at = ? WHERE id = ?`;
  const now = new Date().toISOString();
  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [delta, now, id]);
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(sql, [delta, now, id], () => resolve(true), (_: any, err: any) => reject(err));
      });
    });
  }
}

export async function setStock(id: number, stock: number): Promise<void> {
  const db = await getDB();
  const sql = `UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ?`;
  const now = new Date().toISOString();
  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [Math.max(0, stock), now, id]);
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(sql, [Math.max(0, stock), now, id], () => resolve(true), (_: any, err: any) => reject(err));
      });
    });
  }
}

export async function createInventoryItem(
  item: Omit<InventoryItem, "id">,
): Promise<InventoryItem> {
  const db = await getDB();
  const now = new Date().toISOString();
  const sql = `
    INSERT INTO inventory_items (name, unit, current_stock, min_alert_stock, cost_per_unit, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    item.name,
    item.unit,
    item.current_stock,
    item.min_alert_stock,
    item.cost_per_unit,
    now,
  ];

  let id: number;
  if (typeof db.runAsync === "function") {
    const res = await db.runAsync(sql, params);
    id = res.lastInsertRowId;
  } else {
    id = await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(sql, params, (_: any, res: any) => resolve(res.insertId), (_: any, err: any) => reject(err));
      });
    });
  }

  return {
    id,
    ...item,
    updated_at: now,
  };
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const db = await getDB();
  const sql = `DELETE FROM inventory_items WHERE id = ?`;
  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [id]);
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(sql, [id], () => resolve(true), (_: any, err: any) => reject(err));
      });
    });
  }
}

export async function deductInventoryForOrder(
  cartItems: { product_name: string; quantity: number }[],
): Promise<void> {
  try {
    const db = await getDB();
    const allItems = await getInventoryItems();
    const now = new Date().toISOString();

    let milkDelta = 0;
    let coffeeDelta = 0;
    let cocoDelta = 0;
    let cupsDelta = 0;

    for (const it of cartItems) {
      const name = it.product_name.toLowerCase();
      cupsDelta += it.quantity;

      if (
        name.includes("coffee") ||
        name.includes("latte") ||
        name.includes("cappuccino")
      ) {
        coffeeDelta += 0.02 * it.quantity;
        milkDelta += 0.2 * it.quantity;
      } else if (name.includes("coco") || name.includes("chocolate")) {
        cocoDelta += 0.03 * it.quantity;
        milkDelta += 0.25 * it.quantity;
      } else if (name.includes("shake") || name.includes("frappe")) {
        milkDelta += 0.3 * it.quantity;
      }
    }

    for (const inv of allItems) {
      const invName = inv.name.toLowerCase();
      let deduct = 0;
      if (invName.includes("milk")) deduct = milkDelta;
      else if (invName.includes("coffee")) deduct = coffeeDelta;
      else if (invName.includes("coco")) deduct = cocoDelta;
      else if (invName.includes("cup")) deduct = cupsDelta;

      if (deduct > 0) {
        const newStock = Math.max(
          0,
          Math.round((inv.current_stock - deduct) * 100) / 100,
        );
        const sql = `UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ?`;
        if (typeof db.runAsync === "function") {
          await db.runAsync(sql, [newStock, now, inv.id]);
        } else {
          await new Promise((resolve) => {
            db.transaction((tx: any) => {
              tx.executeSql(
                sql,
                [newStock, now, inv.id],
                () => resolve(true),
                () => resolve(false),
              );
            });
          });
        }
      }
    }
  } catch (e) {
    console.error("Inventory deduction error:", e);
  }
}

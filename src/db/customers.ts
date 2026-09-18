import { getDB } from "./schema";

export interface Customer {
  id: number;
  phone: string;
  name?: string;
  visit_count: number;
  total_spent: number;
  last_visit?: string;
  notes?: string;
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  if (!phone || phone.trim().length < 5) return null;
  const db = await getDB();
  const cleanPhone = phone.trim();
  const sql = `SELECT * FROM customers WHERE phone = ? LIMIT 1`;

  if (typeof db.getFirstAsync === "function") {
    return await db.getFirstAsync(sql, [cleanPhone]);
  }

  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [cleanPhone],
        (_: any, result: any) => {
          if (result.rows.length > 0) {
            resolve(result.rows.item(0));
          } else {
            resolve(null);
          }
        },
        () => resolve(null),
      );
    });
  });
}

export async function recordCustomerVisit(
  phone: string,
  name?: string,
  amountSpent: number = 0,
): Promise<Customer> {
  const db = await getDB();
  const cleanPhone = phone.trim();
  const now = new Date().toISOString();

  const existing = await getCustomerByPhone(cleanPhone);

  if (existing) {
    const newVisitCount = existing.visit_count + 1;
    const newTotalSpent = existing.total_spent + amountSpent;
    const finalName = name?.trim() || existing.name || "Customer";

    const updateSql = `
      UPDATE customers 
      SET visit_count = ?, total_spent = ?, last_visit = ?, name = ?
      WHERE id = ?
    `;

    if (typeof db.runAsync === "function") {
      await db.runAsync(updateSql, [newVisitCount, newTotalSpent, now, finalName, existing.id]);
    } else {
      await new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
          tx.executeSql(updateSql, [newVisitCount, newTotalSpent, now, finalName, existing.id], () => resolve(true), (_: any, err: any) => reject(err));
        });
      });
    }

    return {
      ...existing,
      visit_count: newVisitCount,
      total_spent: newTotalSpent,
      last_visit: now,
      name: finalName,
    };
  } else {
    const finalName = name?.trim() || "Customer";
    const insertSql = `
      INSERT INTO customers (phone, name, visit_count, total_spent, last_visit)
      VALUES (?, ?, 1, ?, ?)
    `;

    let id: number;
    if (typeof db.runAsync === "function") {
      const res = await db.runAsync(insertSql, [cleanPhone, finalName, amountSpent, now]);
      id = res.lastInsertRowId;
    } else {
      id = await new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
          tx.executeSql(insertSql, [cleanPhone, finalName, amountSpent, now], (_: any, res: any) => resolve(res.insertId), (_: any, err: any) => reject(err));
        });
      });
    }

    return {
      id,
      phone: cleanPhone,
      name: finalName,
      visit_count: 1,
      total_spent: amountSpent,
      last_visit: now,
    };
  }
}

export async function getAllCustomers(limit = 100): Promise<Customer[]> {
  const db = await getDB();
  const sql = `SELECT * FROM customers ORDER BY visit_count DESC LIMIT ?`;
  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql, [limit]);
  }
  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [limit],
        (_: any, result: any) => {
          const rows: Customer[] = [];
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

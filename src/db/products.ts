import { getDB } from "./schema";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number;
  image_path?: string | null;
  is_veg: number;
  is_available: number;
  stock_quantity?: number;
  sort_order?: number;
  created_at?: string;
  category_name?: string;
  grad_from?: string;
  grad_to?: string;
}

export async function getProducts(
  categoryId?: number,
  searchQuery?: string,
): Promise<Product[]> {
  const db = await getDB();
  let sql = `
    SELECT p.*, c.name as category_name, c.grad_from, c.grad_to 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (categoryId && categoryId > 0) {
    sql += ` AND p.category_id = ?`;
    params.push(categoryId);
  }

  if (searchQuery && searchQuery.trim()) {
    sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
    params.push(`%${searchQuery.trim()}%`, `%${searchQuery.trim()}%`);
  }

  sql += ` ORDER BY p.is_available DESC, p.sort_order ASC, p.id DESC`;

  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql, params);
  }

  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        params,
        (_: any, result: any) => {
          const rows: Product[] = [];
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

export async function addProduct(
  product: Omit<Product, "id">,
): Promise<number> {
  const db = await getDB();
  const sql = `
    INSERT INTO products (name, description, price, category_id, image_path, is_veg, is_available, stock_quantity, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const stockQty = product.stock_quantity ? Math.max(0, Math.round(product.stock_quantity)) : 0;
  const params = [
    product.name,
    product.description || "",
    product.price,
    product.category_id,
    product.image_path || null,
    product.is_veg ?? 1,
    product.is_available ?? 1,
    stockQty,
    product.sort_order ?? 0,
  ];

  let insertedId: number;
  if (typeof db.runAsync === "function") {
    const res = await db.runAsync(sql, params);
    insertedId = res.lastInsertRowId;
  } else {
    insertedId = await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_: any, res: any) => resolve(res.insertId),
          (_: any, err: any) => reject(err),
        );
      });
    });
  }

  if (stockQty > 0) {
    const logSql = `
      INSERT INTO product_stock_logs (product_id, product_name, change_type, quantity_changed, previous_stock, new_stock, note)
      VALUES (?, ?, 'restock', ?, 0, ?, 'Initial Stock')
    `;
    if (typeof db.runAsync === "function") {
      await db.runAsync(logSql, [insertedId, product.name, stockQty, stockQty]);
    } else {
      await new Promise((resolve) => {
        db.transaction((tx: any) => {
          tx.executeSql(logSql, [insertedId, product.name, stockQty, stockQty]);
          resolve(true);
        });
      });
    }
  }

  return insertedId;
}

export async function updateProduct(
  id: number,
  product: Partial<Product>,
): Promise<void> {
  const db = await getDB();
  const stockQty = product.stock_quantity !== undefined ? Math.max(0, Math.round(product.stock_quantity)) : undefined;

  let sql = `
    UPDATE products 
    SET name = ?, description = ?, price = ?, category_id = ?, is_veg = ?, is_available = ?, image_path = ?
  `;
  const params: any[] = [
    product.name,
    product.description,
    product.price,
    product.category_id,
    product.is_veg,
    product.is_available,
    product.image_path ?? null,
  ];

  if (stockQty !== undefined) {
    try {
      let prevStock = 0;
      let prodName = product.name || "Product";
      const fetchSql = `SELECT name, stock_quantity FROM products WHERE id = ?`;
      if (typeof db.getFirstAsync === "function") {
        const row: any = await db.getFirstAsync(fetchSql, [id]);
        if (row) {
          prevStock = row.stock_quantity || 0;
          prodName = row.name || prodName;
        }
      }
      if (stockQty !== prevStock) {
        const diff = stockQty - prevStock;
        const changeType = diff > 0 ? "restock" : "adjustment";
        const logSql = `
          INSERT INTO product_stock_logs (product_id, product_name, change_type, quantity_changed, previous_stock, new_stock, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        if (typeof db.runAsync === "function") {
          await db.runAsync(logSql, [
            id,
            prodName,
            changeType,
            Math.abs(diff),
            prevStock,
            stockQty,
            diff > 0 ? "Stock Added via Edit Product" : "Stock Adjusted via Edit Product",
          ]);
        }
      }
    } catch (e) {
      console.warn("Stock log notice:", e);
    }

    sql += `, stock_quantity = ?`;
    params.push(stockQty);
  }

  sql += ` WHERE id = ?`;
  params.push(id);

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

export async function updateProductStock(
  productId: number,
  newStock: number,
  note = "Stock Updated",
): Promise<void> {
  const db = await getDB();
  const safeStock = Math.max(0, Math.round(newStock || 0));

  let prevStock = 0;
  let prodName = "Product";
  const fetchSql = `SELECT name, stock_quantity FROM products WHERE id = ?`;
  if (typeof db.getFirstAsync === "function") {
    const row: any = await db.getFirstAsync(fetchSql, [productId]);
    if (row) {
      prevStock = row.stock_quantity || 0;
      prodName = row.name || "Product";
    }
  } else {
    const row: any = await new Promise((resolve) => {
      db.transaction((tx: any) => {
        tx.executeSql(fetchSql, [productId], (_: any, res: any) => {
          resolve(res.rows.length > 0 ? res.rows.item(0) : null);
        }, () => resolve(null));
      });
    });
    if (row) {
      prevStock = row.stock_quantity || 0;
      prodName = row.name || "Product";
    }
  }

  const diff = safeStock - prevStock;
  const changeType = diff >= 0 ? "restock" : "adjustment";
  const updateSql = `UPDATE products SET stock_quantity = ? WHERE id = ?`;
  const logSql = `
    INSERT INTO product_stock_logs (product_id, product_name, change_type, quantity_changed, previous_stock, new_stock, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const logParams = [productId, prodName, changeType, diff, prevStock, safeStock, note];

  if (typeof db.runAsync === "function") {
    await db.runAsync(updateSql, [safeStock, productId]);
    if (diff !== 0) {
      await db.runAsync(logSql, logParams);
    }
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(updateSql, [safeStock, productId]);
        if (diff !== 0) {
          tx.executeSql(logSql, logParams);
        }
        resolve(true);
      }, (err: any) => reject(err));
    });
  }
}

export async function decrementProductStock(
  productId: number,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return;
  const db = await getDB();

  let prevStock = 0;
  let prodName = "Product";
  const fetchSql = `SELECT name, stock_quantity FROM products WHERE id = ?`;
  if (typeof db.getFirstAsync === "function") {
    const row: any = await db.getFirstAsync(fetchSql, [productId]);
    if (row) {
      prevStock = row.stock_quantity || 0;
      prodName = row.name || "Product";
    }
  } else {
    const row: any = await new Promise((resolve) => {
      db.transaction((tx: any) => {
        tx.executeSql(fetchSql, [productId], (_: any, res: any) => {
          resolve(res.rows.length > 0 ? res.rows.item(0) : null);
        }, () => resolve(null));
      });
    });
    if (row) {
      prevStock = row.stock_quantity || 0;
      prodName = row.name || "Product";
    }
  }

  const newStock = Math.max(0, prevStock - quantity);
  const updateSql = `UPDATE products SET stock_quantity = ? WHERE id = ?`;
  const logSql = `
    INSERT INTO product_stock_logs (product_id, product_name, change_type, quantity_changed, previous_stock, new_stock, note)
    VALUES (?, ?, 'sale', ?, ?, ?, 'Order Sale')
  `;

  if (typeof db.runAsync === "function") {
    await db.runAsync(updateSql, [newStock, productId]);
    await db.runAsync(logSql, [productId, prodName, -quantity, prevStock, newStock]);
  } else {
    await new Promise((resolve) => {
      db.transaction((tx: any) => {
        tx.executeSql(updateSql, [newStock, productId]);
        tx.executeSql(logSql, [productId, prodName, -quantity, prevStock, newStock]);
        resolve(true);
      });
    });
  }
}

export async function toggleProductAvailability(
  id: number,
  currentStatus: number,
): Promise<void> {
  const db = await getDB();
  const nextStatus = currentStatus === 1 ? 0 : 1;
  const sql = `UPDATE products SET is_available = ? WHERE id = ?`;

  if (typeof db.runAsync === "function") {
    await db.runAsync(sql, [nextStatus, id]);
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [nextStatus, id],
        () => resolve(),
        (_: any, err: any) => reject(err),
      );
    });
  });
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDB();
  const sql = `DELETE FROM products WHERE id = ?`;

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

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
    INSERT INTO products (name, description, price, category_id, image_path, is_veg, is_available, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    product.name,
    product.description || "",
    product.price,
    product.category_id,
    product.image_path || null,
    product.is_veg ?? 1,
    product.is_available ?? 1,
    product.sort_order ?? 0,
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

export async function updateProduct(
  id: number,
  product: Partial<Product>,
): Promise<void> {
  const db = await getDB();
  const sql = `
    UPDATE products 
    SET name = ?, description = ?, price = ?, category_id = ?, is_veg = ?, is_available = ?, image_path = ?
    WHERE id = ?
  `;
  const params = [
    product.name,
    product.description,
    product.price,
    product.category_id,
    product.is_veg,
    product.is_available,
    product.image_path ?? null,
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

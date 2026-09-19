import { getDB } from "./schema";

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  order_date: string;
  total_amount: number;
  gst_amount: number;
  payment_method: "cash" | "upi" | "card";
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  status: string;
  order_type?: "dine_in" | "takeaway";
  discount_type?:
    | "none"
    | "percentage"
    | "flat"
    | "category_offer"
    | "category_discount"
    | "b1g1"
    | "bxgy"
    | "offer";
  discount_value?: number;
  discount_amount?: number;
  delivery_charge?: number;
  extra_charge_name?: string;
  items?: OrderItem[];
}

export async function createOrder(
  order: Omit<Order, "id">,
  items: Omit<OrderItem, "id" | "order_id">[],
): Promise<Order> {
  const db = await getDB();
  const orderNumber = `CB-${Date.now().toString().slice(-6)}`;
  const orderDate = new Date().toISOString();

  const insertOrderSql = `
    INSERT INTO orders (order_number, order_date, total_amount, gst_amount, payment_method, customer_name, customer_phone, note, status, order_type, discount_type, discount_value, discount_amount, delivery_charge, extra_charge_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const orderParams = [
    orderNumber,
    orderDate,
    order.total_amount,
    order.gst_amount || 0,
    order.payment_method,
    order.customer_name || "Guest",
    order.customer_phone || "",
    order.note || "",
    "completed",
    order.order_type || "dine_in",
    order.discount_type || "none",
    order.discount_value || 0,
    order.discount_amount || 0,
    order.delivery_charge || 0,
    order.extra_charge_name || "Delivery Charge",
  ];

  let orderId: number;

  if (typeof db.runAsync === "function") {
    const res = await db.runAsync(insertOrderSql, orderParams);
    orderId = res.lastInsertRowId;
    for (const it of items) {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.product_id,
          it.product_name,
          it.quantity,
          it.unit_price,
          it.subtotal,
        ],
      );
    }
  } else {
    orderId = await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          insertOrderSql,
          orderParams,
          (_: any, res: any) => {
            const insertedId = res.insertId;
            for (const it of items) {
              tx.executeSql(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
               VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  insertedId,
                  it.product_id,
                  it.product_name,
                  it.quantity,
                  it.unit_price,
                  it.subtotal,
                ],
              );
            }
            resolve(insertedId);
          },
          (_: any, err: any) => reject(err),
        );
      });
    });
  }

  return {
    id: orderId,
    order_number: orderNumber,
    order_date: orderDate,
    total_amount: order.total_amount,
    gst_amount: order.gst_amount || 0,
    payment_method: order.payment_method,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    note: order.note,
    status: "completed",
    order_type: order.order_type || "dine_in",
    discount_type: order.discount_type || "none",
    discount_value: order.discount_value || 0,
    discount_amount: order.discount_amount || 0,
    delivery_charge: order.delivery_charge || 0,
    extra_charge_name: order.extra_charge_name || "Extra Charge",
    items: items.map((i) => ({ ...i, order_id: orderId })),
  };
}

export async function getOrders(limit = 50): Promise<Order[]> {
  const db = await getDB();
  const sql = `SELECT * FROM orders ORDER BY id DESC LIMIT ?`;

  let orders: Order[] = [];
  if (typeof db.getAllAsync === "function") {
    orders = await db.getAllAsync(sql, [limit]);
  } else {
    orders = await new Promise((resolve) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          [limit],
          (_: any, result: any) => {
            const rows: Order[] = [];
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

  // Load items for each order
  for (const ord of orders) {
    ord.items = await getOrderItems(ord.id);
  }

  return orders;
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const db = await getDB();
  const sql = `SELECT * FROM order_items WHERE order_id = ?`;

  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql, [orderId]);
  }

  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [orderId],
        (_: any, result: any) => {
          const rows: OrderItem[] = [];
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

export async function deleteOrder(orderId: number): Promise<boolean> {
  const db = await getDB();
  if (typeof db.runAsync === "function") {
    await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
    await db.runAsync(`DELETE FROM orders WHERE id = ?`, [orderId]);
    return true;
  }
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
      tx.executeSql(
        `DELETE FROM orders WHERE id = ?`,
        [orderId],
        () => resolve(true),
        (_: any, err: any) => reject(err),
      );
    });
  });
}

export async function updateOrder(
  orderId: number,
  orderData: Partial<Order>,
  items?: OrderItem[],
): Promise<void> {
  const db = await getDB();

  // 1. Build dynamic update query for orders table
  const fields: string[] = [];
  const params: any[] = [];

  if (orderData.customer_name !== undefined) {
    fields.push("customer_name = ?");
    params.push(orderData.customer_name);
  }
  if (orderData.customer_phone !== undefined) {
    fields.push("customer_phone = ?");
    params.push(orderData.customer_phone);
  }
  if (orderData.payment_method !== undefined) {
    fields.push("payment_method = ?");
    params.push(orderData.payment_method);
  }
  if (orderData.total_amount !== undefined) {
    fields.push("total_amount = ?");
    params.push(orderData.total_amount);
  }
  if (orderData.gst_amount !== undefined) {
    fields.push("gst_amount = ?");
    params.push(orderData.gst_amount);
  }
  if (orderData.note !== undefined) {
    fields.push("note = ?");
    params.push(orderData.note);
  }
  if (orderData.status !== undefined) {
    fields.push("status = ?");
    params.push(orderData.status);
  }
  if (orderData.order_type !== undefined) {
    fields.push("order_type = ?");
    params.push(orderData.order_type);
  }
  if (orderData.discount_type !== undefined) {
    fields.push("discount_type = ?");
    params.push(orderData.discount_type);
  }
  if (orderData.discount_value !== undefined) {
    fields.push("discount_value = ?");
    params.push(orderData.discount_value);
  }
  if (orderData.discount_amount !== undefined) {
    fields.push("discount_amount = ?");
    params.push(orderData.discount_amount);
  }
  if (orderData.delivery_charge !== undefined) {
    fields.push("delivery_charge = ?");
    params.push(orderData.delivery_charge);
  }
  if (orderData.extra_charge_name !== undefined) {
    fields.push("extra_charge_name = ?");
    params.push(orderData.extra_charge_name);
  }

  if (fields.length > 0) {
    params.push(orderId);
    const sql = `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`;
    if (typeof db.runAsync === "function") {
      await db.runAsync(sql, params);
    } else {
      await new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
          tx.executeSql(sql, params, () => resolve(true), (_: any, err: any) => reject(err));
        });
      });
    }
  }

  // 2. If updated items are provided, replace existing order_items
  if (items && items.length > 0) {
    if (typeof db.runAsync === "function") {
      await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
      for (const it of items) {
        await db.runAsync(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            it.product_id,
            it.product_name,
            it.quantity,
            it.unit_price,
            it.subtotal,
          ],
        );
      }
    } else {
      await new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
          tx.executeSql(`DELETE FROM order_items WHERE order_id = ?`, [orderId], () => {
            for (const it of items) {
              tx.executeSql(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  orderId,
                  it.product_id,
                  it.product_name,
                  it.quantity,
                  it.unit_price,
                  it.subtotal,
                ],
              );
            }
            resolve(true);
          }, (_: any, err: any) => reject(err));
        });
      });
    }
  }
}

export async function clearAllOrders(): Promise<void> {
  const db = await getDB();
  if (typeof db.runAsync === "function") {
    await db.runAsync(`DELETE FROM order_items`);
    await db.runAsync(`DELETE FROM orders`);
    try {
      await db.runAsync(`DELETE FROM sqlite_sequence WHERE name IN ('orders', 'order_items')`);
    } catch {}
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(`DELETE FROM order_items`);
        tx.executeSql(`DELETE FROM orders`, [], () => resolve(true), (_: any, err: any) => reject(err));
      });
    });
  }
}


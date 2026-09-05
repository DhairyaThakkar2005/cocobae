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
  note?: string;
  status: string;
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
    INSERT INTO orders (order_number, order_date, total_amount, gst_amount, payment_method, customer_name, note, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const orderParams = [
    orderNumber,
    orderDate,
    order.total_amount,
    order.gst_amount || 0,
    order.payment_method,
    order.customer_name || "Guest",
    order.note || "",
    "completed",
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
    note: order.note,
    status: "completed",
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

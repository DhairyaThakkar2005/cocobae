import { getDB } from "./schema";

export interface Offer {
  id: number;
  title: string;
  offer_type: "percentage" | "flat" | "category_discount" | "b1g1";
  discount_value: number;
  category_id?: number | null;
  min_order_amount: number;
  is_active: number;
  created_at?: string;
}

export async function getOffers(): Promise<Offer[]> {
  const db = await getDB();
  const sql = `SELECT * FROM offers ORDER BY id DESC`;
  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql);
  }
  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [],
        (_: any, result: any) => {
          const rows: Offer[] = [];
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

export async function getActiveOffers(): Promise<Offer[]> {
  const db = await getDB();
  const sql = `SELECT * FROM offers WHERE is_active = 1 ORDER BY id DESC`;
  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql);
  }
  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        [],
        (_: any, result: any) => {
          const rows: Offer[] = [];
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

export async function createOffer(
  offer: Omit<Offer, "id" | "created_at">,
): Promise<Offer> {
  const db = await getDB();
  const createdAt = new Date().toISOString();
  const sql = `
    INSERT INTO offers (title, offer_type, discount_value, category_id, min_order_amount, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    offer.title,
    offer.offer_type,
    offer.discount_value,
    offer.category_id || null,
    offer.min_order_amount || 0,
    offer.is_active ?? 1,
    createdAt,
  ];

  let id: number;
  if (typeof db.runAsync === "function") {
    const res = await db.runAsync(sql, params);
    id = res.lastInsertRowId;
  } else {
    id = await new Promise((resolve, reject) => {
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

  return {
    id,
    ...offer,
    created_at: createdAt,
  };
}

export async function updateOffer(
  id: number,
  offerData: Partial<Offer>,
): Promise<void> {
  const db = await getDB();
  const fields: string[] = [];
  const params: any[] = [];

  if (offerData.title !== undefined) {
    fields.push("title = ?");
    params.push(offerData.title);
  }
  if (offerData.offer_type !== undefined) {
    fields.push("offer_type = ?");
    params.push(offerData.offer_type);
  }
  if (offerData.discount_value !== undefined) {
    fields.push("discount_value = ?");
    params.push(offerData.discount_value);
  }
  if (offerData.category_id !== undefined) {
    fields.push("category_id = ?");
    params.push(offerData.category_id);
  }
  if (offerData.min_order_amount !== undefined) {
    fields.push("min_order_amount = ?");
    params.push(offerData.min_order_amount);
  }
  if (offerData.is_active !== undefined) {
    fields.push("is_active = ?");
    params.push(offerData.is_active);
  }

  if (fields.length === 0) return;

  params.push(id);
  const sql = `UPDATE offers SET ${fields.join(", ")} WHERE id = ?`;

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

export async function deleteOffer(id: number): Promise<void> {
  const db = await getDB();
  const sql = `DELETE FROM offers WHERE id = ?`;
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

/**
 * Calculates the exact discount amount in Rupees for a given cart and offer.
 */
export function calculateOfferDiscount(
  cartItems: { product: { id: number; price: number; category_id?: number }; quantity: number; subtotal: number }[],
  offer: Offer,
): number {
  if (!offer || !offer.is_active) return 0;
  const subtotal = cartItems.reduce((acc, it) => acc + it.subtotal, 0);

  if (offer.min_order_amount && subtotal < offer.min_order_amount) {
    return 0;
  }

  if (offer.offer_type === "percentage") {
    return Math.round((subtotal * offer.discount_value) / 100);
  }

  if (offer.offer_type === "flat") {
    return Math.min(subtotal, Math.round(offer.discount_value));
  }

  if (offer.offer_type === "category_discount") {
    if (!offer.category_id) return 0;
    const matchingItemsSubtotal = cartItems
      .filter((it) => it.product.category_id === offer.category_id)
      .reduce((acc, it) => acc + it.subtotal, 0);
    return Math.round((matchingItemsSubtotal * offer.discount_value) / 100);
  }

  if (offer.offer_type === "b1g1") {
    const eligibleItems = offer.category_id
      ? cartItems.filter((it) => it.product.category_id === offer.category_id)
      : cartItems;

    let discount = 0;
    for (const it of eligibleItems) {
      const freeUnits = Math.floor(it.quantity / 2);
      discount += freeUnits * it.product.price;
    }
    return Math.round(discount);
  }

  return 0;
}

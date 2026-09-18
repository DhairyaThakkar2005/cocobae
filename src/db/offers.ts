import { getDB } from "./schema";

export interface Offer {
  id: number;
  title: string;
  offer_type: "percentage" | "flat" | "category_discount" | "b1g1" | "bxgy";
  discount_value: number;
  buy_qty?: number;
  get_qty?: number;
  category_id?: number | null;
  product_id?: number | null;
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
    INSERT INTO offers (title, offer_type, discount_value, buy_qty, get_qty, category_id, product_id, min_order_amount, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    offer.title,
    offer.offer_type,
    offer.discount_value || 0,
    offer.buy_qty ?? 1,
    offer.get_qty ?? 1,
    offer.category_id || null,
    offer.product_id || null,
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
  if (offerData.buy_qty !== undefined) {
    fields.push("buy_qty = ?");
    params.push(offerData.buy_qty);
  }
  if (offerData.get_qty !== undefined) {
    fields.push("get_qty = ?");
    params.push(offerData.get_qty);
  }
  if (offerData.category_id !== undefined) {
    fields.push("category_id = ?");
    params.push(offerData.category_id);
  }
  if (offerData.product_id !== undefined) {
    fields.push("product_id = ?");
    params.push(offerData.product_id);
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
 * Checks if a cart item is eligible for an offer (by specific product, category, or store-wide).
 */
export function isItemEligibleForOffer(
  item: { product: { id: number; category_id?: number } },
  offer: Offer,
): boolean {
  if (offer.product_id) {
    return Number(item.product.id) === Number(offer.product_id);
  }
  if (offer.category_id) {
    return Number(item.product.category_id) === Number(offer.category_id);
  }
  return true; // Store-wide
}

/**
 * Calculates the exact discount amount in Rupees for a given cart and offer.
 * Applies the universal BxGy per-unit rate: get_qty / (buy_qty + get_qty)
 * E.g. B1G1 gives 50% discount per unit (1 item of 120 gives 60 discount; 2 items gives 120 discount).
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

  // Universal Buy X Get Y (BxGy) & B1G1
  if (offer.offer_type === "bxgy" || offer.offer_type === "b1g1") {
    const buyQty = Math.max(1, Number(offer.buy_qty) || 1);
    const getQty = Math.max(1, Number(offer.get_qty) || 1);
    const effectiveRate = getQty / (buyQty + getQty);

    const eligibleItems = cartItems.filter((it) => isItemEligibleForOffer(it, offer));
    let discount = 0;
    for (const it of eligibleItems) {
      discount += Math.round(it.subtotal * effectiveRate);
    }
    return Math.round(discount);
  }

  // Percentage discount (store-wide or scoped)
  if (offer.offer_type === "percentage" || offer.offer_type === "category_discount") {
    const eligibleItems = cartItems.filter((it) => isItemEligibleForOffer(it, offer));
    const eligibleSubtotal = eligibleItems.reduce((acc, it) => acc + it.subtotal, 0);
    return Math.round((eligibleSubtotal * (Number(offer.discount_value) || 0)) / 100);
  }

  // Flat Rupee discount (store-wide or scoped)
  if (offer.offer_type === "flat") {
    const eligibleItems = cartItems.filter((it) => isItemEligibleForOffer(it, offer));
    const eligibleSubtotal = eligibleItems.reduce((acc, it) => acc + it.subtotal, 0);
    return Math.min(eligibleSubtotal, Math.round(Number(offer.discount_value) || 0));
  }

  return 0;
}

/**
 * Returns dynamic badge text and discounted unit price for menu display.
 */
export function getOfferBadgeAndPrice(
  product: { id: number; price: number; category_id?: number },
  offers: Offer[],
): { offerBadge?: string; discountedPrice?: number; matchingOffer?: Offer } {
  const activeOffers = (offers || []).filter((o) => o && o.is_active === 1);
  if (activeOffers.length === 0) return {};

  // Match priority: Product-level > Category-level > Store-wide
  const matchingOffer =
    activeOffers.find((o) => o.product_id && Number(o.product_id) === Number(product.id)) ||
    activeOffers.find((o) => o.category_id && Number(o.category_id) === Number(product.category_id)) ||
    activeOffers.find((o) => !o.product_id && !o.category_id);

  if (!matchingOffer) return {};

  if (matchingOffer.offer_type === "bxgy" || matchingOffer.offer_type === "b1g1") {
    const buyQty = Math.max(1, Number(matchingOffer.buy_qty) || 1);
    const getQty = Math.max(1, Number(matchingOffer.get_qty) || 1);
    const rate = getQty / (buyQty + getQty);
    const badge = `B${buyQty}G${getQty} FREE`;
    const discountedPrice = Math.max(0, Math.round(product.price * (1 - rate)));
    return { offerBadge: badge, discountedPrice, matchingOffer };
  }

  if (matchingOffer.offer_type === "category_discount" || matchingOffer.offer_type === "percentage") {
    const badge = `${matchingOffer.discount_value}% OFF`;
    const discountedPrice = Math.max(
      0,
      Math.round(product.price * (1 - (Number(matchingOffer.discount_value) || 0) / 100)),
    );
    return { offerBadge: badge, discountedPrice, matchingOffer };
  }

  if (matchingOffer.offer_type === "flat") {
    const badge = `₹${matchingOffer.discount_value} OFF`;
    const discountedPrice = Math.max(0, product.price - (Number(matchingOffer.discount_value) || 0));
    return { offerBadge: badge, discountedPrice, matchingOffer };
  }

  return { matchingOffer };
}

/**
 * Finds the active offer that yields the highest savings for the current cart.
 */
export function findBestOfferForCart(
  cartItems: { product: { id: number; price: number; category_id?: number }; quantity: number; subtotal: number }[],
  offers: Offer[],
): { bestOffer: Offer | null; bestDiscount: number } {
  const activeOffers = (offers || []).filter((o) => o && o.is_active === 1);
  let bestOffer: Offer | null = null;
  let bestDiscount = 0;

  for (const off of activeOffers) {
    const disc = calculateOfferDiscount(cartItems, off);
    if (disc > bestDiscount) {
      bestDiscount = disc;
      bestOffer = off;
    }
  }

  return { bestOffer, bestDiscount };
}

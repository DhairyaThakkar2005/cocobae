import { getDB } from "./schema";

export type DatePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  preset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

export interface ReportsSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalItemsSold: number;
}

export interface SalesByDateItem {
  date: string; // YYYY-MM-DD
  dayName: string;
  revenue: number;
  ordersCount: number;
  aov: number;
}

export interface ProductSalesItem {
  productId: number;
  productName: string;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  avgPrice: number;
  imagePath?: string | null;
  isVeg: boolean;
}

export interface CustomerSalesItem {
  customerName: string;
  customerPhone: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchase: string;
  avgSpend: number;
}

export interface CategorySalesItem {
  categoryName: string;
  emoji: string;
  unitsSold: number;
  totalRevenue: number;
  percentage: number;
}

export interface PaymentReportItem {
  method: "cash" | "upi" | "card";
  label: string;
  totalCollected: number;
  txCount: number;
  percentage: number;
  avgTicket: number;
}

export function getDateRangeBounds(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (preset === "today") {
    return {
      preset: "today",
      startDate: todayStr,
      endDate: todayStr,
      label: "Today",
    };
  }

  if (preset === "week") {
    const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startStr = weekAgo.toISOString().split("T")[0];
    return {
      preset: "week",
      startDate: startStr,
      endDate: todayStr,
      label: "Last 7 Days",
    };
  }

  if (preset === "month") {
    const monthAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const startStr = monthAgo.toISOString().split("T")[0];
    return {
      preset: "month",
      startDate: startStr,
      endDate: todayStr,
      label: "Last 30 Days",
    };
  }

  // Custom
  const validStart = customStart || todayStr;
  const validEnd = customEnd || todayStr;
  return {
    preset: "custom",
    startDate: validStart,
    endDate: validEnd,
    label: `${validStart} to ${validEnd}`,
  };
}

async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getDB();
  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql, params);
  }
  return new Promise((resolve) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        params,
        (_: any, res: any) => {
          const rows = [];
          for (let i = 0; i < res.rows.length; i++) {
            rows.push(res.rows.item(i));
          }
          resolve(rows);
        },
        () => resolve([]),
      );
    });
  });
}

function getQueryDateBounds(range: DateRange) {
  const startBound = `${range.startDate}T00:00:00`;
  const endBound = `${range.endDate}T23:59:59.999Z`;
  return { startBound, endBound };
}

// 1. Overall Summary
export async function getReportsSummary(range: DateRange): Promise<ReportsSummary> {
  const { startBound, endBound } = getQueryDateBounds(range);

  const orderStats = await queryAll(
    `SELECT 
       COALESCE(SUM(total_amount), 0) as total_rev,
       COUNT(*) as order_count
     FROM orders 
     WHERE order_date >= ? AND order_date <= ?`,
    [startBound, endBound],
  );

  const itemStats = await queryAll(
    `SELECT COALESCE(SUM(oi.quantity), 0) as total_items
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.order_date >= ? AND o.order_date <= ?`,
    [startBound, endBound],
  );

  const totalRevenue = orderStats[0]?.total_rev || 0;
  const totalOrders = orderStats[0]?.order_count || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const totalItemsSold = itemStats[0]?.total_items || 0;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    totalItemsSold,
  };
}

// 2. Report 1: Sales by Date
export async function getSalesByDateReport(
  range: DateRange,
): Promise<SalesByDateItem[]> {
  const { startBound, endBound } = getQueryDateBounds(range);

  const rows = await queryAll(
    `SELECT 
       substr(order_date, 1, 10) as day_date,
       COALESCE(SUM(total_amount), 0) as day_rev,
       COUNT(*) as day_orders
     FROM orders
     WHERE order_date >= ? AND order_date <= ?
     GROUP BY day_date
     ORDER BY day_date DESC`,
    [startBound, endBound],
  );

  return rows.map((r) => {
    const rev = r.day_rev || 0;
    const orders = r.day_orders || 0;
    const aov = orders > 0 ? Math.round(rev / orders) : 0;
    let dayName = "";
    try {
      const d = new Date(r.day_date);
      dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    } catch {
      dayName = "";
    }
    return {
      date: r.day_date,
      dayName,
      revenue: rev,
      ordersCount: orders,
      aov,
    };
  });
}

// 3. Report 2: Product Sales (Searchable + ranked)
export async function getProductSalesReport(
  range: DateRange,
  searchQuery?: string,
): Promise<ProductSalesItem[]> {
  const { startBound, endBound } = getQueryDateBounds(range);
  const searchPattern = searchQuery ? `%${searchQuery.trim().toLowerCase()}%` : null;

  let sql = `
    SELECT 
      oi.product_id,
      oi.product_name,
      COALESCE(c.name, 'Desserts') as category_name,
      SUM(oi.quantity) as units_sold,
      SUM(oi.subtotal) as total_revenue,
      AVG(oi.unit_price) as avg_price,
      p.image_path,
      COALESCE(p.is_veg, 1) as is_veg
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE o.order_date >= ? AND o.order_date <= ?
  `;
  const params: any[] = [startBound, endBound];

  if (searchPattern) {
    sql += ` AND LOWER(oi.product_name) LIKE ?`;
    params.push(searchPattern);
  }

  sql += `
    GROUP BY oi.product_name
    ORDER BY units_sold DESC, total_revenue DESC
  `;

  const rows = await queryAll(sql, params);
  return rows.map((r) => ({
    productId: r.product_id,
    productName: r.product_name,
    categoryName: r.category_name,
    unitsSold: r.units_sold || 0,
    totalRevenue: r.total_revenue || 0,
    avgPrice: r.avg_price || 0,
    imagePath: r.image_path || null,
    isVeg: r.is_veg === 1,
  }));
}

// 4. Report 3: Customer Sales (Searchable by Name/Phone)
export async function getCustomerSalesReport(
  range: DateRange,
  searchQuery?: string,
): Promise<CustomerSalesItem[]> {
  const { startBound, endBound } = getQueryDateBounds(range);
  const searchPattern = searchQuery ? `%${searchQuery.trim().toLowerCase()}%` : null;

  let sql = `
    SELECT 
      COALESCE(NULLIF(customer_name, ''), 'Guest Customer') as name,
      COALESCE(customer_phone, '') as phone,
      COUNT(id) as total_orders,
      SUM(total_amount) as total_spent,
      MAX(order_date) as last_purchase,
      AVG(total_amount) as avg_spend
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
  `;
  const params: any[] = [startBound, endBound];

  if (searchPattern) {
    sql += ` AND (LOWER(customer_name) LIKE ? OR customer_phone LIKE ?)`;
    params.push(searchPattern, searchPattern);
  }

  sql += `
    GROUP BY 
      CASE 
        WHEN customer_phone IS NOT NULL AND customer_phone != '' THEN customer_phone
        WHEN customer_name IS NOT NULL AND customer_name != '' THEN customer_name
        ELSE id
      END
    ORDER BY total_spent DESC, total_orders DESC
  `;

  const rows = await queryAll(sql, params);
  return rows.map((r) => ({
    customerName: r.name,
    customerPhone: r.phone,
    totalOrders: r.total_orders || 0,
    totalSpent: r.total_spent || 0,
    lastPurchase: r.last_purchase || "",
    avgSpend: Math.round(r.avg_spend || 0),
  }));
}

// 5. Report 4: Category Sales (with progress bars and percentages)
export async function getCategorySalesReport(
  range: DateRange,
): Promise<CategorySalesItem[]> {
  const { startBound, endBound } = getQueryDateBounds(range);

  const rows = await queryAll(
    `SELECT 
       COALESCE(c.name, 'Special Desserts') as category_name,
       COALESCE(c.emoji, '🍨') as emoji,
       SUM(oi.quantity) as units_sold,
       SUM(oi.subtotal) as total_revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE o.order_date >= ? AND o.order_date <= ?
     GROUP BY category_name
     ORDER BY total_revenue DESC`,
    [startBound, endBound],
  );

  const totalRevAllCategories = rows.reduce(
    (acc, cur) => acc + (cur.total_revenue || 0),
    0,
  );

  return rows.map((r) => {
    const rev = r.total_revenue || 0;
    const pct = totalRevAllCategories > 0 ? (rev / totalRevAllCategories) * 100 : 0;
    return {
      categoryName: r.category_name,
      emoji: r.emoji,
      unitsSold: r.units_sold || 0,
      totalRevenue: rev,
      percentage: Math.round(pct * 10) / 10,
    };
  });
}

// 6. Report 5: Payment Report
export async function getPaymentReport(
  range: DateRange,
): Promise<{
  items: PaymentReportItem[];
  totalCollected: number;
  totalTransactions: number;
}> {
  const { startBound, endBound } = getQueryDateBounds(range);

  const rows = await queryAll(
    `SELECT 
       payment_method,
       COUNT(*) as tx_count,
       SUM(total_amount) as total_collected,
       AVG(total_amount) as avg_ticket
     FROM orders
     WHERE order_date >= ? AND order_date <= ?
     GROUP BY payment_method`,
    [startBound, endBound],
  );

  const methodMap: Record<string, { label: string; key: "cash" | "upi" | "card" }> = {
    cash: { label: "Cash Payment", key: "cash" },
    upi: { label: "UPI / QR Code", key: "upi" },
    card: { label: "Card / POS Swipe", key: "card" },
  };

  const totalCollected = rows.reduce(
    (acc, cur) => acc + (cur.total_collected || 0),
    0,
  );
  const totalTransactions = rows.reduce(
    (acc, cur) => acc + (cur.tx_count || 0),
    0,
  );

  const items: PaymentReportItem[] = ["cash", "upi", "card"].map((m) => {
    const row = rows.find((r) => r.payment_method === m);
    const coll = row?.total_collected || 0;
    const count = row?.tx_count || 0;
    const pct = totalCollected > 0 ? (coll / totalCollected) * 100 : 0;
    const avg = count > 0 ? Math.round(coll / count) : 0;

    return {
      method: m as "cash" | "upi" | "card",
      label: methodMap[m].label,
      totalCollected: coll,
      txCount: count,
      percentage: Math.round(pct * 10) / 10,
      avgTicket: avg,
    };
  });

  return {
    items,
    totalCollected,
    totalTransactions,
  };
}

import { getDB } from "./schema";

export interface SalesReport {
  todayRevenue: number;
  todayOrdersCount: number;
  weekRevenue: number;
  weekOrdersCount: number;
  monthRevenue: number;
  monthOrdersCount: number;
  topSellingItems: Array<{
    product_name: string;
    total_qty: number;
    total_sales: number;
  }>;
  paymentSplit: { cash: number; upi: number; card: number };
  dailyRevenueChart: Array<{ day: string; revenue: number; orders: number }>;
}

export async function getSalesReport(): Promise<SalesReport> {
  const db = await getDB();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStr = weekAgo.toISOString();

  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStr = monthAgo.toISOString();

  // Helper query runner
  const queryAll = async (sql: string, params: any[] = []): Promise<any[]> => {
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
            for (let i = 0; i < res.rows.length; i++)
              rows.push(res.rows.item(i));
            resolve(rows);
          },
          () => resolve([]),
        );
      });
    });
  };

  // Today
  const todayRes = await queryAll(
    `SELECT COALESCE(SUM(total_amount), 0) as rev, COUNT(*) as count FROM orders WHERE order_date LIKE ?`,
    [`${todayStr}%`],
  );
  const todayRevenue = todayRes[0]?.rev || 0;
  const todayOrdersCount = todayRes[0]?.count || 0;

  // Week
  const weekRes = await queryAll(
    `SELECT COALESCE(SUM(total_amount), 0) as rev, COUNT(*) as count FROM orders WHERE order_date >= ?`,
    [weekStr],
  );
  const weekRevenue = weekRes[0]?.rev || 0;
  const weekOrdersCount = weekRes[0]?.count || 0;

  // Month
  const monthRes = await queryAll(
    `SELECT COALESCE(SUM(total_amount), 0) as rev, COUNT(*) as count FROM orders WHERE order_date >= ?`,
    [monthStr],
  );
  const monthRevenue = monthRes[0]?.rev || 0;
  const monthOrdersCount = monthRes[0]?.count || 0;

  // Top Selling Items
  const topItems = await queryAll(`
    SELECT product_name, SUM(quantity) as total_qty, SUM(subtotal) as total_sales
    FROM order_items
    GROUP BY product_name
    ORDER BY total_qty DESC
    LIMIT 6
  `);

  // Payment Breakdown
  const payments = await queryAll(`
    SELECT payment_method, SUM(total_amount) as total
    FROM orders
    GROUP BY payment_method
  `);
  const paymentSplit = { cash: 0, upi: 0, card: 0 };
  payments.forEach((p: any) => {
    if (p.payment_method === "cash") paymentSplit.cash = p.total || 0;
    if (p.payment_method === "upi") paymentSplit.upi = p.total || 0;
    if (p.payment_method === "card") paymentSplit.card = p.total || 0;
  });

  // Last 7 days breakdown for chart
  const dailyRevenueChart: Array<{
    day: string;
    revenue: number;
    orders: number;
  }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const datePrefix = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

    const dayRes = await queryAll(
      `SELECT COALESCE(SUM(total_amount), 0) as rev, COUNT(*) as count FROM orders WHERE order_date LIKE ?`,
      [`${datePrefix}%`],
    );
    dailyRevenueChart.push({
      day: dayName,
      revenue: dayRes[0]?.rev || 0,
      orders: dayRes[0]?.count || 0,
    });
  }

  return {
    todayRevenue,
    todayOrdersCount,
    weekRevenue,
    weekOrdersCount,
    monthRevenue,
    monthOrdersCount,
    topSellingItems: topItems,
    paymentSplit,
    dailyRevenueChart,
  };
}

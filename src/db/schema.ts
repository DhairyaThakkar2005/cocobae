import * as SQLite from "expo-sqlite";

let dbInstance: any = null;

export async function getDB() {
  if (!dbInstance) {
    if (typeof (SQLite as any).openDatabaseAsync === "function") {
      dbInstance = await (SQLite as any).openDatabaseAsync("cocobae.db");
    } else if (typeof (SQLite as any).openDatabaseSync === "function") {
      dbInstance = (SQLite as any).openDatabaseSync("cocobae.db");
    } else {
      dbInstance = (SQLite as any).openDatabase("cocobae.db");
    }
  }
  return dbInstance;
}

export async function initDatabase() {
  const db = await getDB();

  // Execute table definitions
  const query = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT,
      grad_from TEXT,
      grad_to TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category_id INTEGER,
      image_path TEXT,
      is_veg INTEGER DEFAULT 1,
      is_available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      order_date TEXT,
      total_amount REAL,
      gst_amount REAL DEFAULT 0,
      payment_method TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      note TEXT,
      status TEXT DEFAULT 'completed',
      discount_type TEXT DEFAULT 'none',
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      delivery_charge REAL DEFAULT 0,
      extra_charge_name TEXT DEFAULT 'Delivery Charge'
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      product_name TEXT,
      quantity INTEGER,
      unit_price REAL,
      subtotal REAL
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      offer_type TEXT NOT NULL,
      discount_value REAL DEFAULT 0,
      buy_qty INTEGER DEFAULT 1,
      get_qty INTEGER DEFAULT 1,
      category_id INTEGER,
      product_id INTEGER,
      min_order_amount REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      visit_count INTEGER DEFAULT 1,
      total_spent REAL DEFAULT 0,
      last_visit TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_stock REAL DEFAULT 0,
      min_alert_stock REAL DEFAULT 5,
      cost_per_unit REAL DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      inventory_item_id INTEGER,
      quantity_required REAL
    );

    CREATE TABLE IF NOT EXISTS backup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backed_up_at TEXT,
      file_path TEXT,
      trigger_type TEXT,
      status TEXT
    );
  `;

  const migrationQueries = [
    "ALTER TABLE orders ADD COLUMN customer_phone TEXT;",
    "ALTER TABLE orders ADD COLUMN discount_type TEXT DEFAULT 'none';",
    "ALTER TABLE orders ADD COLUMN discount_value REAL DEFAULT 0;",
    "ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0;",
    "ALTER TABLE orders ADD COLUMN delivery_charge REAL DEFAULT 0;",
    "ALTER TABLE orders ADD COLUMN extra_charge_name TEXT DEFAULT 'Delivery Charge';",
    "ALTER TABLE offers ADD COLUMN product_id INTEGER;",
    "ALTER TABLE offers ADD COLUMN buy_qty INTEGER DEFAULT 1;",
    "ALTER TABLE offers ADD COLUMN get_qty INTEGER DEFAULT 1;",
  ];

  if (typeof db.execAsync === "function") {
    await db.execAsync(query);
    for (const mq of migrationQueries) {
      try {
        await db.execAsync(mq);
      } catch {
        // Column already exists
      }
    }
  } else if (typeof db.exec === "function") {
    await db.exec([{ sql: query, args: [] }], false);
    for (const mq of migrationQueries) {
      try {
        await db.exec([{ sql: mq, args: [] }], false);
      } catch {
        // Column already exists
      }
    }
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          query,
          [],
          () => {
            for (const mq of migrationQueries) {
              tx.executeSql(mq, [], () => {}, () => true);
            }
            resolve(true);
          },
          (_: any, err: any) => reject(err),
        );
      });
    });
  }

  // Seed default offers and inventory items if empty
  await seedInitialOffersAndInventory(db);

  // Check if menu version is up to date with official flyer (v2)
  await checkAndMigrateMenu(db);
}

async function seedInitialOffersAndInventory(db: any) {
  try {
    let offerCount = 0;
    if (typeof db.getFirstAsync === "function") {
      const res = await db.getFirstAsync("SELECT COUNT(*) as count FROM offers;");
      offerCount = res?.count || 0;
    }
    if (offerCount === 0) {
      const initialOffers = [
        { title: "Flat 10% Off", offer_type: "percentage", discount_value: 10, category_id: null },
        { title: "Flat ₹50 Off (Min ₹300)", offer_type: "flat", discount_value: 50, category_id: null },
        { title: "15% Off All Cold Coco", offer_type: "category_discount", discount_value: 15, category_id: 1 },
        { title: "B1G1 Donut Fiesta", offer_type: "b1g1", discount_value: 50, category_id: 3 },
      ];
      for (const off of initialOffers) {
        if (typeof db.runAsync === "function") {
          await db.runAsync(
            "INSERT INTO offers (title, offer_type, discount_value, category_id, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?);",
            [off.title, off.offer_type, off.discount_value, off.category_id, new Date().toISOString()]
          );
        }
      }
    }

    let invCount = 0;
    if (typeof db.getFirstAsync === "function") {
      const res = await db.getFirstAsync("SELECT COUNT(*) as count FROM inventory_items;");
      invCount = res?.count || 0;
    }
    if (invCount === 0) {
      const initialStock = [
        { name: "Full Cream Milk", unit: "Ltr", current_stock: 45, min_alert_stock: 10, cost_per_unit: 62 },
        { name: "Cocoa Powder & Fudge", unit: "Kg", current_stock: 12, min_alert_stock: 3, cost_per_unit: 450 },
        { name: "Cream Cheese", unit: "Kg", current_stock: 8, min_alert_stock: 2, cost_per_unit: 380 },
        { name: "Lotus Biscoff Spread", unit: "Kg", current_stock: 5, min_alert_stock: 1.5, cost_per_unit: 750 },
        { name: "Baking Flour & Sugar", unit: "Kg", current_stock: 30, min_alert_stock: 8, cost_per_unit: 42 },
      ];
      for (const st of initialStock) {
        if (typeof db.runAsync === "function") {
          await db.runAsync(
            "INSERT INTO inventory_items (name, unit, current_stock, min_alert_stock, cost_per_unit, updated_at) VALUES (?, ?, ?, ?, ?, ?);",
            [st.name, st.unit, st.current_stock, st.min_alert_stock, st.cost_per_unit, new Date().toISOString()]
          );
        }
      }
    }
  } catch (e) {
    console.warn("Seeding initial offers/inventory notice:", e);
  }
}

export const OFFICIAL_COCOBAE_MENU = {
  categories: [
    { id: 1, name: "Cold Coco", emoji: "🥤", grad_from: "#6F4E37", grad_to: "#A67C52", sort_order: 1 },
    { id: 2, name: "Fresh Cookies", emoji: "🍪", grad_from: "#D27D2D", grad_to: "#F4A460", sort_order: 2 },
    { id: 3, name: "Donut", emoji: "🍩", grad_from: "#E05A87", grad_to: "#F9A8D4", sort_order: 3 },
    { id: 4, name: "Cookie Tins", emoji: "🎁", grad_from: "#935116", grad_to: "#D4AC0D", sort_order: 4 },
    { id: 5, name: "Bombolini", emoji: "🥯", grad_from: "#C0392B", grad_to: "#E67E22", sort_order: 5 },
    { id: 6, name: "Cheese Cake", emoji: "🍰", grad_from: "#F39C12", grad_to: "#F1C40F", sort_order: 6 },
    { id: 7, name: "Pastries", emoji: "🧁", grad_from: "#884EA0", grad_to: "#BB8FCE", sort_order: 7 },
    { id: 8, name: "Cocobae Special", emoji: "⭐", grad_from: "#D35400", grad_to: "#F39C12", sort_order: 8 },
    { id: 9, name: "Savoury", emoji: "🥖", grad_from: "#27AE60", grad_to: "#2ECC71", sort_order: 9 },
  ],
  products: [
    // 1. Cold Coco
    { name: "Classic Coco", description: "Rich, velvety signature cold chocolate drink.", price: 90, category_id: 1, is_veg: 1 },
    { name: "Choco Chip Coco", description: "Infused with crunchy premium chocolate chips.", price: 100, category_id: 1, is_veg: 1 },
    { name: "Kitkat Coco", description: "Topped with crunchy Kitkat wafer bars & cocoa fudge.", price: 120, category_id: 1, is_veg: 1 },
    { name: "Biscoff Coco", description: "Infused with caramelized Lotus Biscoff spread & crumbs.", price: 120, category_id: 1, is_veg: 1 },
    { name: "Oreo Coco", description: "Loaded with crushed Oreo cookies & chocolate drizzle.", price: 120, category_id: 1, is_veg: 1 },

    // 2. Fresh Cookies
    { name: "Cookie Biscuits (4pcs)", description: "Freshly baked artisan cookies (pack of 4).", price: 400, category_id: 2, is_veg: 1 },
    { name: "Mini Cookies (8pcs)", description: "Bite-sized melt-in-mouth cookies (pack of 8).", price: 160, category_id: 2, is_veg: 1 },
    { name: "Cookie French Fries", description: "Crisp cookie fries served with rich chocolate dip.", price: 160, category_id: 2, is_veg: 1 },

    // 3. Donut
    { name: "Classic Choco Donut", description: "Soft glazed donut dipped in rich dark chocolate.", price: 120, category_id: 3, is_veg: 1 },
    { name: "Classic White Donut", description: "Fluffy donut coated with premium white chocolate ganache.", price: 120, category_id: 3, is_veg: 1 },
    { name: "Oreo Donut", description: "Chocolate glazed donut smothered in crushed Oreo crumbs.", price: 120, category_id: 3, is_veg: 1 },
    { name: "Pistachio Choco Donut", description: "Gourmet donut topped with pistachio cream & chocolate glaze.", price: 150, category_id: 3, is_veg: 1 },
    { name: "Signature Nutella Donut", description: "Decadent donut piped with authentic warm Nutella.", price: 150, category_id: 3, is_veg: 1 },
    { name: "Donut Pops (8 pcs)", description: "Assorted sweet bite-sized donut pops (8 pcs).", price: 150, category_id: 3, is_veg: 1 },

    // 4. Cookie Tins
    { name: "Classic Newyork Tin", description: "Signature New York style cookies in collector tin.", price: 500, category_id: 4, is_veg: 1 },
    { name: "Double Choco Chips Tin", description: "Double chocolate overload cookies in reusable gift tin.", price: 500, category_id: 4, is_veg: 1 },
    { name: "Biscoff Tin", description: "Spiced caramelized Biscoff cookies in gift tin.", price: 500, category_id: 4, is_veg: 1 },
    { name: "Kinder Magic Tin", description: "Luscious hazelnut milk cream chocolate cookies in gift tin.", price: 500, category_id: 4, is_veg: 1 },
    { name: "Brookie Tin", description: "Half brownie, half cookie hybrid sensation in gift tin.", price: 550, category_id: 4, is_veg: 1 },
    { name: "Nutella Tin", description: "Rich Nutella stuffed baked cookies in premium tin.", price: 550, category_id: 4, is_veg: 1 },
    { name: "Ferrero Rocher Tin", description: "Crisp hazelnut chocolate & wafer cookies in gift tin.", price: 550, category_id: 4, is_veg: 1 },

    // 5. Bombolini
    { name: "Dark Chocolate Bombolini", description: "Italian filled donut bursting with molten dark chocolate.", price: 120, category_id: 5, is_veg: 1 },
    { name: "Milk Chocolate Bombolini", description: "Puffy Italian donut loaded with smooth milk chocolate cream.", price: 120, category_id: 5, is_veg: 1 },
    { name: "Nutella Bombolini", description: "Dusted with sugar and stuffed with pure Nutella.", price: 150, category_id: 5, is_veg: 1 },

    // 6. Cheese Cake
    { name: "Blueberry Cheese Cake", description: "Classic New York baked cheesecake with blueberry compote.", price: 230, category_id: 6, is_veg: 1 },
    { name: "Biscoff Cheese Cake", description: "Creamy baked cheesecake layered with spiced Lotus Biscoff.", price: 230, category_id: 6, is_veg: 1 },
    { name: "Nutella Cheese Cake", description: "Velvety cream cheese whipped with pure hazelnut Nutella.", price: 250, category_id: 6, is_veg: 1 },
    { name: "Tiramisu", description: "Espresso soaked ladyfingers layered with mascarpone cream.", price: 250, category_id: 6, is_veg: 1 },

    // 7. Pastries
    { name: "Black Forest Pastry", description: "Layers of chocolate sponge, whipped cream & cherries.", price: 90, category_id: 7, is_veg: 1 },
    { name: "Chocolate Truffle Pastry", description: "Decadent Dutch chocolate sponge with silky truffle ganache.", price: 120, category_id: 7, is_veg: 1 },
    { name: "Nutella Loaded Pastry", description: "Layered sponge cake overflowing with rich Nutella.", price: 140, category_id: 7, is_veg: 1 },

    // 8. Cocobae Special
    { name: "Bae Burger", description: "Signature sweet dessert burger.", price: 120, category_id: 8, is_veg: 1 },
    { name: "Cocobae Happy Meal", description: "Bae Burger + Cookie Fries + Coco combo.", price: 270, category_id: 8, is_veg: 1 },

    // 9. Savoury (Not in the mood for sweet?)
    { name: "Cream Cheese Bun", description: "Savoury little break: Korean-style soft cream cheese bun.", price: 230, category_id: 9, is_veg: 1 },
  ],
};

export async function resetDatabaseToNewMenu(db: any) {
  // Clear orders and products completely as requested by user
  await executeQuery(db, "DELETE FROM order_items");
  await executeQuery(db, "DELETE FROM orders");
  await executeQuery(db, "DELETE FROM products");
  await executeQuery(db, "DELETE FROM categories");

  try {
    await executeQuery(
      db,
      "DELETE FROM sqlite_sequence WHERE name IN ('categories', 'products', 'orders', 'order_items')",
    );
  } catch {
    // sqlite_sequence might not have all tables yet
  }

  // Set default settings including official address & city
  const defaultSettings = [
    ["cafe_name", "CocoBae"],
    [
      "store_address",
      "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
    ],
    ["store_city", "Vadodara"],
    ["store_phone", "7043338863"],
    ["upi_id", "7043338863m@pnb"],
    ["gst_enabled", "0"],
    ["gst_percent", "5"],
    ["auto_backup_enabled", "1"],
    ["backup_time", "02:00"],
    ["retention_days", "7"],
    ["backup_directory_uri", ""],
    ["backup_directory_name", ""],
    ["menu_version", "2"],
  ];

  for (const [key, val] of defaultSettings) {
    await executeQuery(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [key, val],
    );
  }

  // Insert 9 Official Categories
  for (const cat of OFFICIAL_COCOBAE_MENU.categories) {
    await executeQuery(
      db,
      "INSERT INTO categories (id, name, emoji, grad_from, grad_to, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [cat.id, cat.name, cat.emoji, cat.grad_from, cat.grad_to, cat.sort_order],
    );
  }

  // Insert all 34 Official Products
  for (const p of OFFICIAL_COCOBAE_MENU.products) {
    await executeQuery(
      db,
      "INSERT INTO products (name, description, price, category_id, is_veg, is_available) VALUES (?, ?, ?, ?, ?, 1)",
      [p.name, p.description, p.price, p.category_id, p.is_veg],
    );
  }
}

async function checkAndMigrateMenu(db: any) {
  let menuVersion = "";
  try {
    if (typeof db.getAllAsync === "function") {
      const rows = await db.getAllAsync(
        "SELECT value FROM settings WHERE key = 'menu_version'",
      );
      menuVersion = rows[0]?.value || "";
    } else {
      await new Promise((res) => {
        db.transaction((tx: any) => {
          tx.executeSql(
            "SELECT value FROM settings WHERE key = 'menu_version'",
            [],
            (_: any, result: any) => {
              menuVersion = result.rows.item(0)?.value || "";
              res(true);
            },
            () => res(true),
          );
        });
      });
    }
  } catch (e) {
    menuVersion = "";
  }

  // Check category count as well
  let catCount = 0;
  try {
    if (typeof db.getAllAsync === "function") {
      const rows = await db.getAllAsync(
        "SELECT COUNT(*) as count FROM categories",
      );
      catCount = rows[0]?.count || 0;
    }
  } catch {}

  // If menu_version is not 2 or categories empty, run reset & seed
  if (menuVersion !== "2" || catCount === 0) {
    await resetDatabaseToNewMenu(db);
  } else {
    // Make sure store_address, store_city, store_phone, and upi_id are updated to the exact official values
    await executeQuery(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [
        "store_address",
        "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
      ],
    );
    await executeQuery(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      ["store_city", "Vadodara"],
    );
    await executeQuery(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      ["store_phone", "7043338863"],
    );
    await executeQuery(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      ["upi_id", "7043338863m@pnb"],
    );
  }
}

export async function executeQuery(
  db: any,
  sql: string,
  params: any[] = [],
): Promise<any> {
  if (typeof db.runAsync === "function") {
    return await db.runAsync(sql, params);
  }
  if (typeof db.getAllAsync === "function") {
    return await db.getAllAsync(sql, params);
  }
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        params,
        (_: any, result: any) => resolve(result),
        (_: any, error: any) => reject(error),
      );
    });
  });
}


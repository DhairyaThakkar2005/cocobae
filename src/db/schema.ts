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
      status TEXT DEFAULT 'completed'
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

    CREATE TABLE IF NOT EXISTS backup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backed_up_at TEXT,
      file_path TEXT,
      trigger_type TEXT,
      status TEXT
    );
  `;

  if (typeof db.execAsync === "function") {
    await db.execAsync(query);
    try {
      await db.execAsync("ALTER TABLE orders ADD COLUMN customer_phone TEXT;");
    } catch {
      // Column already exists
    }
  } else if (typeof db.exec === "function") {
    await db.exec([{ sql: query, args: [] }], false);
    try {
      await db.exec([{ sql: "ALTER TABLE orders ADD COLUMN customer_phone TEXT;", args: [] }], false);
    } catch {
      // Column already exists
    }
  } else {
    await new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          query,
          [],
          () => {
            tx.executeSql("ALTER TABLE orders ADD COLUMN customer_phone TEXT;", [], () => resolve(true), () => resolve(true));
          },
          (_: any, err: any) => reject(err),
        );
      });
    });
  }

  // Seed default settings and initial categories/products if empty
  await seedInitialData(db);
}

async function seedInitialData(db: any) {
  // Check if categories exist
  let count = 0;
  try {
    if (typeof db.getAllAsync === "function") {
      const rows = await db.getAllAsync(
        "SELECT COUNT(*) as count FROM categories",
      );
      count = rows[0]?.count || 0;
    } else {
      await new Promise((res) => {
        db.transaction((tx: any) => {
          tx.executeSql(
            "SELECT COUNT(*) as count FROM categories",
            [],
            (_: any, result: any) => {
              count = result.rows.item(0)?.count || 0;
              res(true);
            },
            () => res(true),
          );
        });
      });
    }
  } catch (e) {
    count = 0;
  }

  if (count === 0) {
    // Default Settings
    const defaultSettings = [
      ["cafe_name", "CocoBae Dessert Café"],
      ["store_phone", "9876543210"],
      ["store_city", "Ahmedabad"],
      ["upi_id", "cocobae@upi"],
      ["gst_enabled", "0"],
      ["gst_percent", "5"],
      ["auto_backup_enabled", "1"],
      ["backup_time", "02:00"],
      ["retention_days", "7"],
      ["backup_directory_uri", ""],
      ["backup_directory_name", ""],
    ];

    for (const [key, val] of defaultSettings) {
      await executeQuery(
        db,
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [key, val],
      );
    }

    // Default Categories
    const categories = [
      ["Cakes & Pastries", "🍰", "#FF6B6B", "#FFE66D", 1],
      ["Ice Creams & Sundaes", "🍦", "#4ECDC4", "#556270", 2],
      ["Belgian Waffles", "🧇", "#F7971E", "#FFD200", 3],
      ["Thick Shakes", "🥤", "#A18CD1", "#FBC2EB", 4],
      ["Gooey Brownies", "🍫", "#8B4513", "#D2691E", 5],
      ["Puddings & Tarts", "🍮", "#F3904F", "#3B4371", 6],
    ];

    for (const cat of categories) {
      await executeQuery(
        db,
        "INSERT INTO categories (name, emoji, grad_from, grad_to, sort_order) VALUES (?, ?, ?, ?, ?)",
        cat,
      );
    }

    // Default Products for CocoBae
    const products = [
      [
        "Belgian Dark Chocolate Cake",
        "Rich 70% dark chocolate sponge layered with ganache & cocoa nibs.",
        280,
        1,
        1,
      ],
      [
        "Red Velvet Cream Cheese Slice",
        "Classic velvety red sponge with silky Philadelphia cream cheese.",
        250,
        1,
        1,
      ],
      [
        "Lotus Biscoff Cheesecake",
        "Baked New York style cheesecake topped with melted Biscoff spread & crumble.",
        310,
        1,
        1,
      ],

      [
        "CocoBae Signature Sundae",
        "Trio of dark chocolate, hazelnut & Madagascar vanilla scoops with warm fudge.",
        240,
        2,
        1,
      ],
      [
        "Salted Caramel Pecan Gelato",
        "Artisanal Italian gelato churned with Himalayan pink salt and roasted pecans.",
        190,
        2,
        1,
      ],
      [
        "Berry Blast Sorbet",
        "Refreshing dairy-free wild strawberry & blueberry sorbet.",
        170,
        2,
        1,
      ],

      [
        "Nutella & Roasted Hazelnut Waffle",
        "Crispy golden waffle smothered in warm Nutella and toasted hazelnuts.",
        260,
        3,
        1,
      ],
      [
        "Classic Maple Butter Waffle",
        "Freshly baked Belgian waffle served with whipped butter & organic maple syrup.",
        210,
        3,
        1,
      ],
      [
        "Triple Chocolate Overload Waffle",
        "Dark, milk & white chocolate drizzle topped with choco chips.",
        270,
        3,
        1,
      ],

      [
        "Ferrero Rocher Monster Shake",
        "Blended whole Ferrero chocolates with hazelnut cream & topped with brownie bits.",
        290,
        4,
        1,
      ],
      [
        "Alphonso Mango Cream Shake",
        "Fresh mango pulp blended with rich vanilla cream and crushed pistachios.",
        240,
        4,
        1,
      ],
      [
        "Oreo Mudslide Thick Shake",
        "Crushed Oreos, dark chocolate fudge and double cream.",
        230,
        4,
        1,
      ],

      [
        "Sizzling Walnut Brownie",
        "Warm gooey brownie served on a hot skillet with hot chocolate sauce.",
        220,
        5,
        1,
      ],
      [
        "Fudge Chocolate Lava Cake",
        "Molten chocolate heart oozing from a delicate warm chocolate cake.",
        240,
        5,
        1,
      ],
      [
        "Caramel Custard Pudding",
        "Velvety smooth baked eggless caramel custard with golden syrup.",
        180,
        6,
        1,
      ],
    ];

    for (const p of products) {
      await executeQuery(
        db,
        "INSERT INTO products (name, description, price, category_id, is_veg) VALUES (?, ?, ?, ?, ?)",
        p,
      );
    }
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

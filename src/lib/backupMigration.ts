import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import * as SQLite from "expo-sqlite";
import { getDB, resetDB, initDatabase } from "../db/schema";
import { getSetting } from "../db/settings";
import { logBackup } from "../db/backupLog";
import { ensureProductImageDir, toRelativeImagePath } from "./imageUtils";

export interface BackupManifest {
  app: "CocoBae";
  version: string;
  backupVersion: number;
  createdAt: string;
  dbFile: string;
  productCount: number;
  imageCount: number;
  productImageMap: Record<string, string>; // productId -> relativePath
}

export interface BackupValidationResult {
  isValid: boolean;
  fileType: "zip" | "db";
  manifest?: BackupManifest;
  error?: string;
  dbSize?: number;
  imageCount?: number;
}

export interface BackupFileItem {
  name: string;
  uri: string;
  isZip: boolean;
  size?: number;
  modificationTime?: number;
}

const MANIFEST_FILE_NAME = "manifest.json";
const DB_FILE_NAME = "cocobae.db";
const BACKUP_DIR_NAME = "CocoBae_Backups/";
const SAFETY_DIR_NAME = "CocoBae_SafetyBackup/";
const STAGING_DIR_NAME = "CocoBae_RestoreStaging/";

function getDocDir(): string {
  return (FileSystem as any).documentDirectory || "";
}

function getDbDir(): string {
  return `${getDocDir()}SQLite/`;
}

function getBackupDir(): string {
  return `${getDocDir()}${BACKUP_DIR_NAME}`;
}

function getImageDir(): string {
  return `${getDocDir()}product_images/`;
}

/**
 * Creates a complete cross-device migration archive (.zip) containing:
 * 1. manifest.json (metadata, image mapping, app signature)
 * 2. cocobae.db (SQLite database snapshot)
 * 3. product_images/ (all dessert photo files)
 */
export async function createFullBackupZip(
  triggerType: "manual" | "auto" = "manual",
): Promise<{
  success: boolean;
  filename: string;
  path: string;
  customFolderSaved?: boolean;
  customFolderName?: string;
  manifest?: BackupManifest;
  error?: string;
}> {
  try {
    const docDir = getDocDir();
    const dbPath = `${getDbDir()}${DB_FILE_NAME}`;
    const backupDir = getBackupDir();

    // 1. Ensure backup directory exists
    const bInfo = await FileSystem.getInfoAsync(backupDir);
    if (!bInfo.exists) {
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
    }

    // 2. Locate source database
    let validDbPath = dbPath;
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (!dbInfo.exists) {
      const fallbackPath = `${docDir}${DB_FILE_NAME}`;
      const fbInfo = await FileSystem.getInfoAsync(fallbackPath);
      if (fbInfo.exists) {
        validDbPath = fallbackPath;
      } else {
        throw new Error("Source database (cocobae.db) not found.");
      }
    }

    // 3. Query all products to build the manifest
    const db = await getDB();
    let products: Array<{ id: number; name: string; image_path?: string | null }> = [];
    try {
      if (typeof db.getAllAsync === "function") {
        products = await db.getAllAsync(
          "SELECT id, name, image_path FROM products",
        );
      } else {
        products = await new Promise((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(
              "SELECT id, name, image_path FROM products",
              [],
              (_: any, res: any) => {
                const rows = [];
                for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
                resolve(rows);
              },
              () => resolve([]),
            );
          });
        });
      }
    } catch (dbErr) {
      console.warn("[BackupMigration] Products query warning:", dbErr);
    }

    // 4. Scan existing product images on disk
    const imgDir = await ensureProductImageDir();
    const imageFilesOnDisk = await FileSystem.readDirectoryAsync(imgDir);

    // Build product image mapping
    const productImageMap: Record<string, string> = {};
    for (const p of products) {
      if (p.image_path) {
        productImageMap[p.id.toString()] = toRelativeImagePath(p.image_path);
      }
    }

    // 5. Construct Versioned Manifest
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
    const filename = `cocobae_backup_${dateStr}_${timeStr}.zip`;
    const destZipPath = `${backupDir}${filename}`;

    const manifest: BackupManifest = {
      app: "CocoBae",
      version: "1.0.0",
      backupVersion: 2,
      createdAt: now.toISOString(),
      dbFile: DB_FILE_NAME,
      productCount: products.length,
      imageCount: imageFilesOnDisk.length,
      productImageMap,
    };

    // 6. Build the ZIP Archive using JSZip (Binary handling)
    const zip = new JSZip();

    // Add manifest
    zip.file(MANIFEST_FILE_NAME, JSON.stringify(manifest, null, 2));

    // Add SQLite database binary
    const dbBase64 = await FileSystem.readAsStringAsync(validDbPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    zip.file(DB_FILE_NAME, dbBase64, { base64: true });

    // Add product images folder into ZIP
    const imgFolder = zip.folder("product_images");
    for (const imgName of imageFilesOnDisk) {
      try {
        const filePath = `${imgDir}${imgName}`;
        const fileContent = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (imgFolder) {
          imgFolder.file(imgName, fileContent, { base64: true });
        }
      } catch (readErr) {
        console.warn(`[BackupMigration] Could not read image ${imgName}:`, readErr);
      }
    }

    // Generate binary ZIP file as Base64
    const zipBase64 = await zip.generateAsync({
      type: "base64",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // Write ZIP file to local backups directory
    await FileSystem.writeAsStringAsync(destZipPath, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Also prune older backups based on retention setting
    const retentionDays =
      parseInt(await getSetting("retention_days", "7"), 10) || 7;
    await pruneOldBackups(backupDir, retentionDays);

    // Log to DB
    await logBackup(destZipPath, triggerType, "success");

    // 7. If custom SAF backup folder is selected, write directly to phone folder
    let customFolderSaved = false;
    let customFolderName: string | undefined;
    try {
      const customDirUri = await getSetting("backup_directory_uri", "");
      customFolderName = await getSetting("backup_directory_name", "");

      if (customDirUri && FileSystem.StorageAccessFramework) {
        const createdFileUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            customDirUri,
            filename,
            "application/zip",
          );

        await FileSystem.writeAsStringAsync(createdFileUri, zipBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        customFolderSaved = true;
      }
    } catch (safErr) {
      console.warn("[BackupMigration] SAF custom folder sync notice:", safErr);
    }

    return {
      success: true,
      filename,
      path: destZipPath,
      customFolderSaved,
      customFolderName,
      manifest,
    };
  } catch (err: any) {
    console.error("[BackupMigration] Full backup failure:", err);
    await logBackup("", triggerType, "failed");
    return {
      success: false,
      filename: "",
      path: "",
      error: err.message || "Failed to create full backup ZIP.",
    };
  }
}

/**
 * Validates a backup archive (.zip or .db) before attempting restore.
 */
export async function validateBackupArchive(
  fileUri: string,
): Promise<BackupValidationResult> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return { isValid: false, fileType: "zip", error: "Selected file does not exist." };
    }

    if (info.size === 0) {
      return { isValid: false, fileType: "zip", error: "Backup file is empty (0 bytes)." };
    }

    // Check if it's a legacy .db file
    if (fileUri.endsWith(".db")) {
      return {
        isValid: true,
        fileType: "db",
        dbSize: info.size,
      };
    }

    // Validate ZIP Archive
    const base64Content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(base64Content, { base64: true });

    // Check for manifest
    const manifestEntry = zip.file(MANIFEST_FILE_NAME);
    if (!manifestEntry) {
      // Check if it at least contains cocobae.db
      const dbEntry = zip.file(DB_FILE_NAME);
      if (dbEntry) {
        return {
          isValid: true,
          fileType: "zip",
          error: "Legacy archive (no manifest found, but database is present).",
        };
      }
      return {
        isValid: false,
        fileType: "zip",
        error: "Not a valid CocoBae backup archive: missing manifest.json and cocobae.db.",
      };
    }

    const manifestJson = await manifestEntry.async("string");
    const manifest: BackupManifest = JSON.parse(manifestJson);

    if (manifest.app !== "CocoBae") {
      return {
        isValid: false,
        fileType: "zip",
        error: `Incompatible backup file. App signature is "${manifest.app}", expected "CocoBae".`,
      };
    }

    // Verify cocobae.db inside ZIP
    const dbEntry = zip.file(DB_FILE_NAME);
    if (!dbEntry) {
      return {
        isValid: false,
        fileType: "zip",
        error: "Archive is corrupted: missing cocobae.db inside the ZIP.",
      };
    }

    // Count images inside product_images/ folder
    let imgCount = 0;
    zip.folder("product_images")?.forEach(() => {
      imgCount += 1;
    });

    return {
      isValid: true,
      fileType: "zip",
      manifest,
      imageCount: imgCount,
    };
  } catch (err: any) {
    return {
      isValid: false,
      fileType: "zip",
      error: `Validation error: ${err.message || "Failed to read backup file."}`,
    };
  }
}

/**
 * Creates an automatic safety backup of current database and images before restore.
 */
async function createSafetyBackup(): Promise<string> {
  const docDir = getDocDir();
  const safetyDir = `${docDir}${SAFETY_DIR_NAME}`;
  const sInfo = await FileSystem.getInfoAsync(safetyDir);
  if (sInfo.exists) {
    await FileSystem.deleteAsync(safetyDir, { idempotent: true });
  }
  await FileSystem.makeDirectoryAsync(safetyDir, { intermediates: true });

  // Backup current DB
  const liveDbPath = `${getDbDir()}${DB_FILE_NAME}`;
  const dbInfo = await FileSystem.getInfoAsync(liveDbPath);
  if (dbInfo.exists) {
    await FileSystem.copyAsync({
      from: liveDbPath,
      to: `${safetyDir}${DB_FILE_NAME}`,
    });
  }

  // Backup current images
  const liveImgDir = getImageDir();
  const imgInfo = await FileSystem.getInfoAsync(liveImgDir);
  if (imgInfo.exists) {
    const safetyImgDir = `${safetyDir}product_images/`;
    await FileSystem.makeDirectoryAsync(safetyImgDir, { intermediates: true });
    const files = await FileSystem.readDirectoryAsync(liveImgDir);
    for (const f of files) {
      await FileSystem.copyAsync({
        from: `${liveImgDir}${f}`,
        to: `${safetyImgDir}${f}`,
      });
    }
  }

  return safetyDir;
}

/**
 * Rolls back the safety backup if restore encounters a failure.
 */
async function rollbackFromSafetyBackup(): Promise<void> {
  try {
    const docDir = getDocDir();
    const safetyDir = `${docDir}${SAFETY_DIR_NAME}`;
    const safetyDb = `${safetyDir}${DB_FILE_NAME}`;
    const liveDb = `${getDbDir()}${DB_FILE_NAME}`;

    const sDbInfo = await FileSystem.getInfoAsync(safetyDb);
    if (sDbInfo.exists) {
      await FileSystem.copyAsync({ from: safetyDb, to: liveDb });
    }

    const safetyImgDir = `${safetyDir}product_images/`;
    const sImgInfo = await FileSystem.getInfoAsync(safetyImgDir);
    if (sImgInfo.exists) {
      const liveImgDir = getImageDir();
      const files = await FileSystem.readDirectoryAsync(safetyImgDir);
      for (const f of files) {
        await FileSystem.copyAsync({
          from: `${safetyImgDir}${f}`,
          to: `${liveImgDir}${f}`,
        });
      }
    }
  } catch (rollbackErr) {
    console.error("[BackupMigration] Rollback error:", rollbackErr);
  }
}

/**
 * Transactional, rollback-safe restore of database and product images from a ZIP or DB.
 */
export async function restoreFullBackup(
  fileUri: string,
  mode: "merge" | "overwrite" = "merge",
): Promise<{
  success: boolean;
  restoredProducts: number;
  restoredImages: number;
  restoredOrders: number;
  mergedOrdersCount?: number;
  preservedOrdersCount?: number;
  mode: "merge" | "overwrite";
  error?: string;
}> {
  // 1. Pre-restore validation
  const validation = await validateBackupArchive(fileUri);
  if (!validation.isValid) {
    throw new Error(validation.error || "Backup validation failed.");
  }

  const docDir = getDocDir();
  const dbDir = getDbDir();
  const liveDbPath = `${dbDir}${DB_FILE_NAME}`;
  const stagingDir = `${docDir}${STAGING_DIR_NAME}`;

  // 2. Create Safety Backup of current state
  await createSafetyBackup();

  try {
    // 3. Setup clean staging directory
    const stgInfo = await FileSystem.getInfoAsync(stagingDir);
    if (stgInfo.exists) {
      await FileSystem.deleteAsync(stagingDir, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(stagingDir, { intermediates: true });

    let restoredImagesCount = 0;

    if (validation.fileType === "db") {
      // Legacy .db direct restore
      await FileSystem.copyAsync({
        from: fileUri,
        to: `${stagingDir}${DB_FILE_NAME}`,
      });
    } else {
      // Full .zip archive extraction
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const zip = await JSZip.loadAsync(base64, { base64: true });

      // Extract cocobae.db to staging
      const dbEntry = zip.file(DB_FILE_NAME);
      if (!dbEntry) throw new Error("Missing cocobae.db in backup archive.");
      const dbBase64 = await dbEntry.async("base64");
      await FileSystem.writeAsStringAsync(`${stagingDir}${DB_FILE_NAME}`, dbBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Extract all product images
      const stagingImgDir = `${stagingDir}product_images/`;
      await FileSystem.makeDirectoryAsync(stagingImgDir, { intermediates: true });

      const imagePromises: Promise<any>[] = [];
      zip.folder("product_images")?.forEach((relPath, file) => {
        if (!file.dir) {
          const promise = async () => {
            const imgData = await file.async("base64");
            const targetPath = `${stagingImgDir}${relPath}`;
            await FileSystem.writeAsStringAsync(targetPath, imgData, {
              encoding: FileSystem.EncodingType.Base64,
            });
            restoredImagesCount += 1;
          };
          imagePromises.push(promise());
        }
      });
      await Promise.all(imagePromises);

      // Move staging images into live product_images/ directory
      const liveImgDir = await ensureProductImageDir();
      const stagingImages = await FileSystem.readDirectoryAsync(stagingImgDir);
      for (const imgName of stagingImages) {
        const src = `${stagingImgDir}${imgName}`;
        const dest = `${liveImgDir}${imgName}`;
        await FileSystem.copyAsync({ from: src, to: dest });
      }
    }

    const stagedDb = `${stagingDir}${DB_FILE_NAME}`;
    const sInfo = await FileSystem.getInfoAsync(stagedDb);
    if (!sInfo.exists || sInfo.size === 0) {
      throw new Error("Staged database snapshot is missing or corrupted.");
    }

    let mergedOrdersCount = 0;
    let preservedOrdersCount = 0;

    if (mode === "merge") {
      // --- SMART MERGE MODE: PRESERVE ALL CURRENT BILLS & APPEND BACKUP BILLS ---
      await initDatabase();
      const liveDb = await getDB();

      // Count existing live orders
      try {
        if (typeof liveDb.getAllAsync === "function") {
          const oRows = await liveDb.getAllAsync("SELECT COUNT(*) as count FROM orders;");
          preservedOrdersCount = oRows[0]?.count || 0;
        }
      } catch {}

      // Copy staged DB into SQLite folder so expo-sqlite can open it as a temporary database
      const tempDbName = `cocobae_merge_temp_${Date.now()}.db`;
      const tempDbPath = `${dbDir}${tempDbName}`;
      await FileSystem.copyAsync({ from: stagedDb, to: tempDbPath });

      let backupDb: any = null;
      if (typeof (SQLite as any).openDatabaseAsync === "function") {
        backupDb = await (SQLite as any).openDatabaseAsync(tempDbName);
      } else if (typeof (SQLite as any).openDatabaseSync === "function") {
        backupDb = (SQLite as any).openDatabaseSync(tempDbName);
      } else {
        backupDb = (SQLite as any).openDatabase(tempDbName);
      }

      try {
        // 1. Merge Categories
        let backupCategories: any[] = [];
        try {
          if (typeof backupDb.getAllAsync === "function") {
            backupCategories = await backupDb.getAllAsync("SELECT * FROM categories;");
          }
        } catch {}

        const liveCategories: any[] = typeof liveDb.getAllAsync === "function"
          ? await liveDb.getAllAsync("SELECT name FROM categories;")
          : [];
        const liveCatNames = new Set(liveCategories.map((c: any) => String(c.name || "").toLowerCase().trim()));

        for (const cat of backupCategories) {
          const cleanName = String(cat.name || "").trim();
          if (cleanName && !liveCatNames.has(cleanName.toLowerCase())) {
            try {
              await liveDb.runAsync(
                "INSERT INTO categories (name, emoji, grad_from, grad_to, sort_order) VALUES (?, ?, ?, ?, ?);",
                [cat.name, cat.emoji, cat.grad_from, cat.grad_to, cat.sort_order ?? 0]
              );
              liveCatNames.add(cleanName.toLowerCase());
            } catch {}
          }
        }

        // 2. Merge Products
        let backupProducts: any[] = [];
        try {
          if (typeof backupDb.getAllAsync === "function") {
            backupProducts = await backupDb.getAllAsync("SELECT * FROM products;");
          }
        } catch {}

        const liveProducts: any[] = typeof liveDb.getAllAsync === "function"
          ? await liveDb.getAllAsync("SELECT name FROM products;")
          : [];
        const liveProdNames = new Set(liveProducts.map((p: any) => String(p.name || "").toLowerCase().trim()));

        for (const prod of backupProducts) {
          const cleanProd = String(prod.name || "").trim();
          if (cleanProd && !liveProdNames.has(cleanProd.toLowerCase())) {
            try {
              await liveDb.runAsync(
                `INSERT INTO products (
                  name, description, price, category_id, image_path, is_veg, is_available, stock_quantity, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                  prod.name,
                  prod.description || "",
                  prod.price,
                  prod.category_id,
                  prod.image_path || null,
                  prod.is_veg ?? 1,
                  prod.is_available ?? 1,
                  prod.stock_quantity ?? 0,
                  prod.sort_order ?? 0,
                ]
              );
              liveProdNames.add(cleanProd.toLowerCase());
            } catch {}
          }
        }

        // 3. Merge Orders & Order Items
        let backupOrders: any[] = [];
        try {
          if (typeof backupDb.getAllAsync === "function") {
            backupOrders = await backupDb.getAllAsync("SELECT * FROM orders ORDER BY id ASC;");
          }
        } catch {}

        const liveOrders: any[] = typeof liveDb.getAllAsync === "function"
          ? await liveDb.getAllAsync("SELECT order_number FROM orders;")
          : [];
        const liveOrderNums = new Set(liveOrders.map((o: any) => String(o.order_number || "")));

        for (const bo of backupOrders) {
          if (!bo.order_number || liveOrderNums.has(bo.order_number)) {
            // Already present in live orders — skip to prevent duplicate bills!
            continue;
          }

          try {
            const insRes = await liveDb.runAsync(
              `INSERT INTO orders (
                order_number, order_date, total_amount, gst_amount, payment_method,
                customer_name, customer_phone, note, status, order_type,
                discount_type, discount_value, discount_amount, delivery_charge,
                extra_charge_name, extra_charges_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                bo.order_number,
                bo.order_date,
                bo.total_amount,
                bo.gst_amount ?? 0,
                bo.payment_method || "cash",
                bo.customer_name || "Walk In Customer",
                bo.customer_phone || "",
                bo.note || "",
                bo.status || "completed",
                bo.order_type || "dine_in",
                bo.discount_type || "none",
                bo.discount_value ?? 0,
                bo.discount_amount ?? 0,
                bo.delivery_charge ?? 0,
                bo.extra_charge_name || "Delivery Charge",
                bo.extra_charges_json || null,
              ]
            );
            const newOrderId = insRes.lastInsertRowId;
            liveOrderNums.add(bo.order_number);
            mergedOrdersCount++;

            // Fetch line items for this order from backupDb
            let items: any[] = [];
            try {
              items = await backupDb.getAllAsync("SELECT * FROM order_items WHERE order_id = ?;", [bo.id]);
            } catch {}

            for (const item of items) {
              try {
                await liveDb.runAsync(
                  `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
                   VALUES (?, ?, ?, ?, ?, ?);`,
                  [newOrderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal]
                );
              } catch {}
            }
          } catch (ordErr) {
            console.warn("Order merge notice:", bo.order_number, ordErr);
          }
        }
      } finally {
        if (backupDb && typeof backupDb.closeAsync === "function") {
          try {
            await backupDb.closeAsync();
          } catch {}
        }
        try {
          await FileSystem.deleteAsync(tempDbPath, { idempotent: true });
        } catch {}
      }
    } else {
      // --- FULL OVERWRITE MODE: COMPLETE REPLACEMENT ---
      const dInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }

      await FileSystem.copyAsync({ from: stagedDb, to: liveDbPath });

      // Also copy to fallback path
      const fallbackPath = `${docDir}${DB_FILE_NAME}`;
      try {
        await FileSystem.copyAsync({ from: stagedDb, to: fallbackPath });
      } catch {}

      // Reset database instance connection to force re-open of newly restored file
      await resetDB();

      // Re-run database migrations so restored backups from older versions get all new columns!
      await initDatabase();
    }

    // Connect and normalize all image paths in the active database
    const db = await getDB();
    try {
      if (typeof db.execAsync === "function") {
        await db.execAsync(`
          UPDATE products 
          SET image_path = 'product_images/' || substr(image_path, instr(image_path, 'product_images/') + 15)
          WHERE image_path LIKE '%product_images/%';
        `);
      }
    } catch (normErr) {
      console.warn("[BackupMigration] Path normalization note:", normErr);
    }

    // Post-restore verification
    let productCount = 0;
    let orderCount = 0;
    try {
      if (typeof db.getAllAsync === "function") {
        const pRows = await db.getAllAsync("SELECT COUNT(*) as count FROM products");
        const oRows = await db.getAllAsync("SELECT COUNT(*) as count FROM orders");
        productCount = pRows[0]?.count || 0;
        orderCount = oRows[0]?.count || 0;
      }
    } catch (verErr) {
      console.warn("[BackupMigration] Post-restore count note:", verErr);
    }

    // Clean up staging directory
    await FileSystem.deleteAsync(stagingDir, { idempotent: true });

    return {
      success: true,
      restoredProducts: productCount,
      restoredImages: restoredImagesCount,
      restoredOrders: orderCount,
      mergedOrdersCount,
      preservedOrdersCount,
      mode,
    };
  } catch (restoreErr: any) {
    console.error("[BackupMigration] Restore failure. Initiating rollback...", restoreErr);
    await rollbackFromSafetyBackup();
    throw new Error(
      `Restore failed: ${restoreErr.message || "Unknown error"}. Previous data was safely rolled back.`,
    );
  }
}

/**
 * Returns all available backup files (both modern .zip and legacy .db)
 */
export async function getBackupArchives(): Promise<BackupFileItem[]> {
  try {
    const backupDir = getBackupDir();
    const dirInfo = await FileSystem.getInfoAsync(backupDir);
    if (!dirInfo.exists) return [];

    const files = await FileSystem.readDirectoryAsync(backupDir);
    const result: BackupFileItem[] = [];

    for (const f of files) {
      if (f.endsWith(".zip") || f.endsWith(".db")) {
        const filePath = `${backupDir}${f}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        result.push({
          name: f,
          uri: filePath,
          isZip: f.endsWith(".zip"),
          size: fileInfo.exists ? fileInfo.size : undefined,
          modificationTime: fileInfo.exists
            ? fileInfo.modificationTime
            : undefined,
        });
      }
    }

    return result.sort(
      (a, b) => (b.modificationTime || 0) - (a.modificationTime || 0),
    );
  } catch (e) {
    return [];
  }
}

/**
 * Shares a backup file via native Android sharing (WhatsApp, Drive, Bluetooth).
 */
export async function shareBackupArchive(uri: string, isZip: boolean) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: isZip ? "application/zip" : "application/x-sqlite3",
      dialogTitle: "Share CocoBae Backup File",
    });
  }
}

/**
 * Prunes old backup archives exceeding retention days.
 */
async function pruneOldBackups(dir: string, maxDays: number) {
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    const now = Date.now();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

    for (const f of files) {
      if (
        (f.startsWith("cocobae_backup_") && (f.endsWith(".zip") || f.endsWith(".db")))
      ) {
        const filePath = `${dir}${f}`;
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists && info.modificationTime) {
          if (now - info.modificationTime * 1000 > maxAgeMs) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          }
        }
      }
    }
  } catch (e) {
    console.warn("[BackupMigration] Pruning error:", e);
  }
}

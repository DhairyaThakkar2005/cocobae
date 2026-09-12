import * as FileSystem from "expo-file-system/legacy";

/**
 * Ensures the local product_images directory exists and returns its full path.
 */
export async function ensureProductImageDir(): Promise<string> {
  const docDir = (FileSystem as any).documentDirectory || "";
  const imgDir = `${docDir}product_images/`;
  const info = await FileSystem.getInfoAsync(imgDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(imgDir, { intermediates: true });
  }
  return imgDir;
}

/**
 * Converts any local filesystem path or URI into a portable relative path:
 * e.g. "product_images/prod_1726123456789.jpg"
 */
export function toRelativeImagePath(pathOrUri: string): string {
  if (!pathOrUri) return "";
  const clean = pathOrUri.trim();

  // If already relative
  if (clean.startsWith("product_images/")) {
    return clean;
  }

  // Extract from absolute URI containing product_images/
  const match = clean.match(/product_images\/([^/]+)$/);
  if (match && match[1]) {
    return `product_images/${match[1]}`;
  }

  // If just filename
  const filename = clean.split("/").pop();
  if (filename) {
    return `product_images/${filename}`;
  }

  return clean;
}

/**
 * Resolves a product's image reference into a live, valid URI for React Native <Image>.
 * Supports:
 * 1. Portable relative paths: "product_images/prod_123.jpg" -> "file:///data/user/0/.../files/product_images/prod_123.jpg"
 * 2. Legacy absolute paths from previous phones: "file:///data/user/0/old_device/.../product_images/prod_123.jpg" -> remapped to current device!
 * 3. Remote/inline URIs (http, https, data:).
 */
export function resolveProductImageUri(
  imagePath?: string | null,
): string | null {
  if (!imagePath || typeof imagePath !== "string") {
    return null;
  }

  const clean = imagePath.trim();
  if (!clean) return null;

  // Remote or base64 data URIs
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:")
  ) {
    return clean;
  }

  const docDir = (FileSystem as any).documentDirectory || "";

  // Legacy absolute path handling (e.g. from old phone backup)
  if (clean.startsWith("file://")) {
    const match = clean.match(/product_images\/([^/]+)$/);
    if (match && match[1]) {
      return `${docDir}product_images/${match[1]}`;
    }
    return clean;
  }

  // Relative path (e.g. "product_images/prod_123.jpg")
  const stripped = clean.startsWith("/") ? clean.slice(1) : clean;
  return `${docDir}${stripped}`;
}

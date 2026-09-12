import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { logBackup } from "../db/backupLog";
import { getSetting } from "../db/settings";

export const BACKUP_TASK_NAME = "COCOBAE_DAILY_BACKUP";

async function sendLocalBackupNotification(
  filename: string,
  path: string,
  folderName?: string,
) {
  try {
    const Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const body = folderName
      ? `✅ Backup saved to ${folderName}: ${filename}`
      : `✅ Database backup saved: ${filename}`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🍨 CocoBae Daily Backup",
        body,
        data: { path },
      },
      trigger: null,
    });
  } catch (e) {
    // Notifications gracefully bypassed in Expo Go sandbox
  }
}

// Define background WorkManager task
try {
  const TaskManager = require("expo-task-manager");
  const BackgroundFetch = require("expo-background-fetch");

  TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
    try {
      const autoEnabled = await getSetting("auto_backup_enabled", "1");
      if (autoEnabled === "0") {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const backupResult = await performDatabaseBackup("auto");
      if (backupResult.success) {
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      return BackgroundFetch.BackgroundFetchResult.Failed;
    } catch (err) {
      console.error("[BackupTask] Background backup error:", err);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
} catch (e) {
  // Gracefully ignored in Expo Go
}

export async function registerDailyBackupTask() {
  try {
    const TaskManager = require("expo-task-manager");
    const BackgroundFetch = require("expo-background-fetch");

    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
        minimumInterval: 60 * 60 * 24, // 24 hours
        stopOnTerminate: false, // Keeps alive on app exit
        startOnBoot: true, // Resumes after device reboot
      });
    }
  } catch (err) {
    // Graceful warning suppression in Expo Go sandbox
  }
}

export async function performDatabaseBackup(
  triggerType: "auto" | "manual",
): Promise<{
  success: boolean;
  filename: string;
  path: string;
  customFolderSaved?: boolean;
  customFolderName?: string;
  error?: string;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const timestamp = Date.now().toString().slice(-4);
    const filename = `cocobae_backup_${today}_${timestamp}.db`;

    const docDir = (FileSystem as any).documentDirectory || "";
    const dbDir = `${docDir}SQLite/`;
    const srcDbPath = `${dbDir}cocobae.db`;

    // Ensure target backup directory exists
    const backupDir = `${docDir}CocoBae_Backups/`;
    const dirInfo = await FileSystem.getInfoAsync(backupDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
    }

    const destPath = `${backupDir}${filename}`;

    // Verify source exists
    const srcInfo = await FileSystem.getInfoAsync(srcDbPath);
    if (!srcInfo.exists) {
      const fallbackSrc = `${docDir}cocobae.db`;
      const fallbackInfo = await FileSystem.getInfoAsync(fallbackSrc);
      if (fallbackInfo.exists) {
        await FileSystem.copyAsync({ from: fallbackSrc, to: destPath });
      } else {
        throw new Error("Database source file not found");
      }
    } else {
      await FileSystem.copyAsync({ from: srcDbPath, to: destPath });
    }

    // Prune old backups based on retention policy
    const retentionDays =
      parseInt(await getSetting("retention_days", "7"), 10) || 7;
    await pruneOldBackups(backupDir, retentionDays);

    // Log to DB
    await logBackup(destPath, triggerType, "success");

    // If custom backup directory URI is configured, also copy into user's chosen folder
    let customFolderSaved = false;
    let customFolderName: string | undefined;

    try {
      const customDirUri = await getSetting("backup_directory_uri", "");
      customFolderName = await getSetting("backup_directory_name", "");

      if (customDirUri && FileSystem.StorageAccessFramework) {
        const fileContent = await FileSystem.readAsStringAsync(destPath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const createdFileUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            customDirUri,
            filename,
            "application/x-sqlite3",
          );

        await FileSystem.writeAsStringAsync(createdFileUri, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });

        customFolderSaved = true;
      }
    } catch (safErr) {
      console.warn("[BackupTask] SAF custom folder sync notice:", safErr);
    }

    // Trigger local notification (showing custom folder location if saved)
    await sendLocalBackupNotification(
      filename,
      destPath,
      customFolderSaved ? customFolderName : undefined,
    );

    return {
      success: true,
      filename,
      path: destPath,
      customFolderSaved,
      customFolderName,
    };
  } catch (err: any) {
    console.error("[BackupTask] Backup failure:", err);
    await logBackup("", triggerType, "failed");
    return { success: false, filename: "", path: "", error: err.message };
  }
}

export async function requestCustomBackupDirectory(): Promise<{
  uri: string;
  name: string;
} | null> {
  try {
    if (FileSystem.StorageAccessFramework) {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const decodedUri = decodeURIComponent(permissions.directoryUri);
        const folderName =
          decodedUri.split("/").filter(Boolean).pop()?.replace("primary:", "") ||
          "Custom Folder";
        return {
          uri: permissions.directoryUri,
          name: folderName,
        };
      }
    }
  } catch (e) {
    console.warn("[BackupTask] Directory picker error:", e);
  }
  return null;
}

export async function exportBackupToCustomFolder(
  sourceUri: string,
  filename: string,
): Promise<boolean> {
  try {
    if (FileSystem.StorageAccessFramework) {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const fileContent = await FileSystem.readAsStringAsync(sourceUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const createdFileUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            "application/x-sqlite3",
          );
        await FileSystem.writeAsStringAsync(createdFileUri, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return true;
      }
    }
  } catch (e) {
    console.warn("[BackupTask] Export to custom folder error:", e);
  }
  return false;
}

export async function getBackupFiles(): Promise<
  Array<{ name: string; uri: string; size?: number; modificationTime?: number }>
> {
  try {
    const docDir = (FileSystem as any).documentDirectory || "";
    const backupDir = `${docDir}CocoBae_Backups/`;
    const dirInfo = await FileSystem.getInfoAsync(backupDir);
    if (!dirInfo.exists) return [];

    const files = await FileSystem.readDirectoryAsync(backupDir);
    const result = [];
    for (const f of files) {
      if (f.endsWith(".db")) {
        const fileInfo = await FileSystem.getInfoAsync(`${backupDir}${f}`);
        result.push({
          name: f,
          uri: `${backupDir}${f}`,
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

export async function shareBackupFile(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/x-sqlite3",
      dialogTitle: "Export CocoBae Database Backup",
    });
  }
}

async function pruneOldBackups(dir: string, maxDays: number) {
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    const now = Date.now();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

    for (const f of files) {
      if (f.startsWith("cocobae_backup_") && f.endsWith(".db")) {
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
    console.warn("[BackupTask] Pruning error:", e);
  }
}

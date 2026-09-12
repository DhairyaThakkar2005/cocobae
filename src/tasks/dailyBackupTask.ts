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

import { createFullBackupZip, getBackupArchives, shareBackupArchive } from "../lib/backupMigration";

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
  const res = await createFullBackupZip(triggerType);
  if (res.success) {
    await sendLocalBackupNotification(
      res.filename,
      res.path,
      res.customFolderSaved ? res.customFolderName : undefined,
    );
  }
  return res;
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
  Array<{ name: string; uri: string; isZip?: boolean; size?: number; modificationTime?: number }>
> {
  return await getBackupArchives();
}

export async function shareBackupFile(uri: string) {
  await shareBackupArchive(uri, uri.endsWith(".zip"));
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
